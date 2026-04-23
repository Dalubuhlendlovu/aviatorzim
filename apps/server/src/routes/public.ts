import { Router } from "express";
import { getDashboardData, getRecentRoundHistory, getRoundByRoundId } from "../lib/account-repository.js";
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

    const round = await getRoundByRoundId(nonce);
    if (!round) {
      return res.status(404).json({ error: "Round not found." });
    }

    return res.json({
      roundId: round.roundId,
      hash: round.hash,
      crashPoint: round.crashPoint,
      startedAt: round.startedAt,
      crashedAt: round.crashedAt,
      status: round.status,
      verificationMethod: "record-hash",
      note: "Server-seed reveal verification is not enabled in this build. This endpoint validates immutable round record data only."
    });
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
