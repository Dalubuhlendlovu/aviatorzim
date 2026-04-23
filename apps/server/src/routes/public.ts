import { Router } from "express";
import { GAME_RULES, type RoundVerificationResult } from "@aviator-zim/shared";
import { generateCrash, hashSeed } from "@aviator-zim/shared/provably-fair";
import { getDashboardData, getRecentRoundHistory, getRoundVerificationRecord } from "../lib/account-repository.js";
import { liveChat, leaderboard } from "../lib/store.js";
import { GameEngine } from "../services/gameEngine.js";

export function createPublicRouter(gameEngine: GameEngine) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "aviator-zim-server" });
  });

  router.get("/game/state", (_req, res) => {
    res.json(gameEngine.getPublicState());
  });

  router.get("/game/history", async (_req, res) => {
    const rounds = await getRecentRoundHistory(20);
    res.json({ rounds });
  });

  router.get("/game/verify/:nonce", async (req, res) => {
    const nonce = Number.parseInt(req.params.nonce, 10);
    if (Number.isNaN(nonce) || nonce <= 0) {
      return res.status(400).json({ error: "Nonce must be a positive integer." });
    }

    const round = await getRoundVerificationRecord(nonce);
    if (!round) {
      return res.status(404).json({ error: "Round not found." });
    }

    if (!round.serverSeed || !round.clientSeed || !round.seedHash || !round.nonce) {
      return res.status(409).json({
        error: "Verification data is unavailable for this round record.",
        roundId: round.roundId
      });
    }

    const recomputed = generateCrash(round.serverSeed, round.clientSeed, round.nonce, GAME_RULES.defaultHouseEdge);
    const recomputedSeedHash = hashSeed(round.serverSeed);
    const storedCrashPoint = Number(round.crashPoint.toString());

    const payload: RoundVerificationResult = {
      roundId: round.roundId,
      nonce: round.nonce,
      houseEdge: GAME_RULES.defaultHouseEdge,
      clientSeed: round.clientSeed,
      serverSeed: round.serverSeed,
      seedHash: round.seedHash,
      outcomeHash: round.hash,
      crashPoint: storedCrashPoint,
      recomputed: {
        seedHash: recomputedSeedHash,
        outcomeHash: recomputed.hash,
        crashPoint: recomputed.crashPoint
      },
      matches: {
        seedCommitment: recomputedSeedHash === round.seedHash,
        outcomeHash: recomputed.hash === round.hash,
        crashPoint: Number(recomputed.crashPoint.toFixed(2)) === Number(storedCrashPoint.toFixed(2))
      }
    };

    return res.json(payload);
  });

  router.get("/dashboard/:userId", async (req, res) => {
    const dashboardData = await getDashboardData(req.params.userId);

    if (!dashboardData) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      profile: dashboardData.profile,
      contactEmail: dashboardData.contactEmail,
      transactions: dashboardData.transactions,
      leaderboard,
      rewards: {
        dailyRewardUsd: 2,
        nextLevelProgress: 68,
        referralBonusUsd: 5
      }
    });
  });

  router.get("/community", (_req, res) => {
    res.json({ chat: liveChat.slice(-25), leaderboard });
  });

  return router;
}
