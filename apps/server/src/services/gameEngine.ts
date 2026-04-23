import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import {
  GAME_RULES,
  getLiveMultiplier,
  type CrashRound,
  type PublicRoundState
} from "@aviator-zim/shared";
import { generateCrash, hashSeed } from "@aviator-zim/shared/provably-fair";

interface RoundEvents {
  round: (state: PublicRoundState) => void;
  crash: (round: CrashRound) => void;
}

export class GameEngine extends EventEmitter {
  private nonce = 0;
  private currentRound: CrashRound;
  private history: number[] = [1.14, 2.48, 1.01, 3.62, 1.87, 6.2];
  private interval?: NodeJS.Timeout;

  constructor() {
    super();
    this.currentRound = this.createRound();
  }

  public start() {
    this.scheduleNextRound(1_000);
  }

  public getPublicState(): PublicRoundState {
    return {
      roundId: this.currentRound.roundId,
      hash: this.currentRound.hash,
      seedHash: this.currentRound.seedHash,
      status: this.currentRound.status,
      elapsedMs: this.currentRound.elapsedMs,
      currentMultiplier: this.currentRound.currentMultiplier,
      startedAt: this.currentRound.startedAt,
      lastCrashPoint: this.history[0],
      history: this.history.slice(0, 10)
    };
  }

  public getCurrentRound(): CrashRound {
    return this.currentRound;
  }

  private createRound(): CrashRound {
    this.nonce += 1;
    const serverSeed = randomBytes(32).toString("hex");
    const seedHash = hashSeed(serverSeed);
    const clientSeed = randomBytes(16).toString("hex");
    const { hash, crashPoint } = generateCrash(serverSeed, clientSeed, this.nonce, GAME_RULES.defaultHouseEdge);

    return {
      roundId: this.nonce,
      hash,
      seedHash,
      serverSeed,
      crashPoint,
      nonce: this.nonce,
      clientSeed,
      status: "starting",
      elapsedMs: 0,
      currentMultiplier: 1,
      startedAt: new Date().toISOString()
    };
  }

  private scheduleNextRound(delayMs: number) {
    setTimeout(() => {
      this.currentRound = this.createRound();
      this.currentRound.status = "running";
      const startedAtMs = Date.now();

      this.interval = setInterval(() => {
        const elapsedMs = Date.now() - startedAtMs;
        const multiplier = getLiveMultiplier(elapsedMs);
        this.currentRound.elapsedMs = elapsedMs;
        this.currentRound.currentMultiplier = multiplier;

        if (multiplier >= this.currentRound.crashPoint) {
          this.crashCurrentRound();
          return;
        }

        this.emit("round", this.getPublicState());
      }, 60);
    }, delayMs);
  }

  private crashCurrentRound() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    this.currentRound.status = "crashed";
    this.currentRound.crashedAt = new Date().toISOString();
    this.currentRound.currentMultiplier = this.currentRound.crashPoint;
    this.history.unshift(this.currentRound.crashPoint);
    this.history = this.history.slice(0, 20);
    this.emit("crash", this.currentRound);
    this.scheduleNextRound(2_000);
  }

  public override on<U extends keyof RoundEvents>(event: U, listener: RoundEvents[U]): this {
    return super.on(event, listener);
  }
}
