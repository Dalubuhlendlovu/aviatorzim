import { Router } from "express";
import { GAME_RULES, type PlayMode } from "@aviator-zim/shared";
import { z } from "zod";
import {
  cashOutCrashBet,
  getActiveRoundExposure,
  getActiveBetForUser,
  getBetHistoryForUser,
  placeCrashBet
} from "../lib/account-repository.js";
import { GameEngine } from "../services/gameEngine.js";

const placeBetSchema = z.object({
  amountUsd: z.coerce.number().min(GAME_RULES.minimumBetUsd).max(GAME_RULES.maximumBetUsd),
  mode: z.enum(["demo", "real"]),
  autoCashOutMultiplier: z.coerce.number().min(1.01).max(GAME_RULES.maxRiskMultiplierForExposure).optional()
});

export function createGameRouter(gameEngine: GameEngine) {
  const router = Router();

  router.get("/history", async (req, res) => {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const recentBets = await getBetHistoryForUser(userId, 20);
    return res.json({ recentBets });
  });

  router.get("/active-bet", async (req, res) => {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const round = gameEngine.getCurrentRound();
    const activeBet = await getActiveBetForUser(userId, round.nonce);
    return res.json({ activeBet });
  });

  router.post("/bet", async (req, res) => {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const parsed = placeBetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const currentRound = gameEngine.getCurrentRound();
    if (currentRound.status !== "running") {
      return res.status(400).json({ error: "Betting window has closed for this round." });
    }

    if (currentRound.elapsedMs > GAME_RULES.bettingWindowCloseMs) {
      return res.status(400).json({ error: "Betting window has closed for this round." });
    }

    const requestedTargetMultiplier = Math.max(
      1,
      Math.min(
        parsed.data.autoCashOutMultiplier ?? GAME_RULES.maxRiskMultiplierForExposure,
        GAME_RULES.maxRiskMultiplierForExposure
      )
    );
    const requestedPotentialPayoutUsd = Number((parsed.data.amountUsd * requestedTargetMultiplier).toFixed(2));

    if (requestedPotentialPayoutUsd > GAME_RULES.maxPotentialPayoutPerBetUsd) {
      return res.status(400).json({
        error: `Bet exceeds per-bet risk limit of $${GAME_RULES.maxPotentialPayoutPerBetUsd.toFixed(2)} potential payout.`
      });
    }

    const currentExposure = await getActiveRoundExposure(currentRound.nonce);
    if (currentExposure.totalPotentialPayoutUsd + requestedPotentialPayoutUsd > GAME_RULES.maxPotentialPayoutPerRoundUsd) {
      return res.status(400).json({
        error: "Round risk limit reached. Please try the next round or reduce stake/auto cash-out."
      });
    }

    try {
      const result = await placeCrashBet({
        userId,
        amountUsd: parsed.data.amountUsd,
        mode: parsed.data.mode as PlayMode,
        roundNonce: currentRound.nonce,
        autoCashOutMultiplier: parsed.data.autoCashOutMultiplier
      });

      return res.status(201).json({
        success: true,
        activeBet: result.bet,
        profile: result.profile
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place bet.";
      return res.status(400).json({ error: message });
    }
  });

  router.post("/cashout", async (req, res) => {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const currentRound = gameEngine.getCurrentRound();

    if (currentRound.status !== "running") {
      return res.status(400).json({ error: "The round is not currently running." });
    }

    try {
      const result = await cashOutCrashBet({
        userId,
        roundNonce: currentRound.nonce,
        multiplier: currentRound.currentMultiplier
      });

      return res.json({
        success: true,
        activeBet: result.bet,
        profile: result.profile,
        payoutUsd: result.payoutUsd
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to cash out bet.";
      return res.status(400).json({ error: message });
    }
  });

  return router;
}
