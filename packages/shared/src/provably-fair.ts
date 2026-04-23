import crypto from "node:crypto";
import { GAME_RULES, type VerificationResult } from "./index.js";

export function hashSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

export function generateHash(serverSeed: string, clientSeed: string, nonce: number): string {
  return crypto.createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
}

export function hashToFloat(hash: string): number {
  const slice = hash.slice(0, 13);
  const value = Number.parseInt(slice, 16);
  return value / 2 ** 52;
}

export function getCrashPoint(randomFloat: number, houseEdge = GAME_RULES.defaultHouseEdge): number {
  if (randomFloat <= 0) {
    return 1;
  }

  const multiplier = (100 / (1 - randomFloat)) * (1 - houseEdge);
  return Math.max(1, Math.floor(multiplier) / 100);
}

export function generateCrash(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdge = GAME_RULES.defaultHouseEdge
): VerificationResult {
  const hash = generateHash(serverSeed, clientSeed, nonce);
  const randomFloat = hashToFloat(hash);

  return {
    hash,
    randomFloat,
    crashPoint: getCrashPoint(randomFloat, houseEdge)
  };
}
