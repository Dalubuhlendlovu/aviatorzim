import { Router } from "express";
import { approveWithdrawal, getAdminOverview, rejectWithdrawal } from "../lib/account-repository.js";

export const adminRouter = Router();

adminRouter.get("/overview", async (_req, res) => {
  const overview = await getAdminOverview();
  return res.json(overview);
});

adminRouter.post("/withdrawals/:transactionId/approve", async (req, res) => {
  try {
    const transaction = await approveWithdrawal(req.params.transactionId);
    return res.json({ success: true, status: transaction.status, transactionId: transaction.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve withdrawal.";
    return res.status(400).json({ error: message });
  }
});

adminRouter.post("/withdrawals/:transactionId/reject", async (req, res) => {
  try {
    const transaction = await rejectWithdrawal(req.params.transactionId);
    return res.json({ success: true, status: transaction.status, transactionId: transaction.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reject withdrawal.";
    return res.status(400).json({ error: message });
  }
});
