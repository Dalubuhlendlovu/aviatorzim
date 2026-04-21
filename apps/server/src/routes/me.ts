import { Router } from "express";
import { getDashboardData } from "../lib/account-repository.js";
import { leaderboard } from "../lib/store.js";

export const meRouter = Router();

meRouter.get("/dashboard", async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const dashboardData = await getDashboardData(userId);

  if (!dashboardData) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json({
    profile: dashboardData.profile,
    contactEmail: dashboardData.contactEmail,
    transactions: dashboardData.transactions,
    recentBets: dashboardData.recentBets,
    leaderboard,
    rewards: {
      dailyRewardUsd: 2,
      nextLevelProgress: 68,
      referralBonusUsd: 5
    }
  });
});
