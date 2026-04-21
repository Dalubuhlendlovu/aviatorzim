import express, { Router } from "express";
import { z } from "zod";
import { GAME_RULES, type PaymentProvider } from "@aviator-zim/shared";
import { paynow } from "../config/paynow.js";
import {
  assertPollBelongsToUser,
  createPendingDeposit,
  createWithdrawalRequest,
  finalizeDeposit,
  getStoredUser
} from "../lib/account-repository.js";
import { requireAuth } from "../middleware/auth.js";

const depositSchema = z.object({
  provider: z.enum(GAME_RULES.paymentProviders),
  amountUsd: z.coerce.number().min(GAME_RULES.minimumDepositUsd),
  phoneNumber: z.string().trim().min(7).optional()
}).superRefine((value, context) => {
  if (value.provider !== "PayNow" && !value.phoneNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phoneNumber"],
      message: "Phone number is required for EcoCash and OneMoney deposits."
    });
  }
});

const statusSchema = z.object({
  pollUrl: z.string().url()
});

const withdrawalSchema = z.object({
  provider: z.enum(GAME_RULES.paymentProviders),
  amountUsd: z.coerce.number().min(GAME_RULES.minimumWithdrawalUsd)
});

const mobileMoneyProviders = {
  EcoCash: "ecocash",
  OneMoney: "onemoney"
} as const satisfies Record<Exclude<PaymentProvider, "PayNow">, string>;

function toText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function getPaymentStatusLabel(value: { status?: unknown } | null | undefined) {
  return toText(value?.status).toLowerCase() || "pending";
}

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\s+/g, "");
}

export const paymentsRouter = Router();

paymentsRouter.post("/result", express.text({ type: "*/*" }), async (req, res) => {
  try {
    const statusUpdate = paynow.parseStatusUpdate(toText(req.body));
    const status = toText(statusUpdate.status).toLowerCase();

    if (status === "paid") {
      await finalizeDeposit(toText(statusUpdate.pollUrl), toText(statusUpdate.paynowReference));
    }

    return res.status(200).send("OK");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Paynow result callback.";
    return res.status(400).send(message);
  }
});

paymentsRouter.use(requireAuth);

paymentsRouter.post("/deposit", async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = await getStoredUser(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const reference = `AZG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const payment = paynow.createPayment(reference, user.email);
    payment.add("Aviator Deposit", parsed.data.amountUsd);

    const response = parsed.data.provider === "PayNow"
      ? await paynow.send(payment)
      : await paynow.sendMobile(
          payment,
          normalizePhoneNumber(parsed.data.phoneNumber ?? user.phoneNumber),
          mobileMoneyProviders[parsed.data.provider]
        );

    if (!response?.success) {
      return res.status(400).json({
        error: response?.error ? toText(response.error) : "Payment failed to initialize."
      });
    }

    const pollUrl = toText(response.pollUrl);
    await createPendingDeposit({
      userId,
      amountUsd: parsed.data.amountUsd,
      provider: parsed.data.provider,
      pollUrl,
      reference,
      phoneNumber: parsed.data.phoneNumber
    });

    return res.status(202).json({
      success: true,
      status: "pending",
      provider: parsed.data.provider,
      pollUrl,
      redirectUrl: response.hasRedirect ? toText(response.redirectUrl) : undefined,
      instructions: response.instructions
        ? toText(response.instructions)
        : parsed.data.provider === "PayNow"
          ? "Open the Paynow checkout page to complete your deposit."
          : "Complete payment on your phone.",
      reference
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed.";
    return res.status(500).json({ error: message });
  }
});

paymentsRouter.post("/status", async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!(await assertPollBelongsToUser(parsed.data.pollUrl, userId))) {
    return res.status(404).json({ error: "Payment session not found." });
  }

  try {
    const statusResponse = await paynow.pollTransaction(parsed.data.pollUrl);
    const status = getPaymentStatusLabel(statusResponse as { status?: unknown });

    if (status === "paid") {
      const result = await finalizeDeposit(parsed.data.pollUrl);
      return res.json({
        status,
        balanceUsd: result.user.balanceUsd,
        alreadyCredited: result.alreadyCredited
      });
    }

    return res.json({ status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to poll transaction status.";
    return res.status(500).json({ error: message });
  }
});

paymentsRouter.post("/withdraw", async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const parsed = withdrawalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!(await getStoredUser(userId))) {
    return res.status(404).json({ error: "User not found." });
  }

  try {
    await createWithdrawalRequest({
      userId,
      amountUsd: parsed.data.amountUsd,
      provider: parsed.data.provider
    });

    return res.status(202).json({
      success: true,
      status: "review",
      provider: parsed.data.provider satisfies PaymentProvider,
      message: "Withdrawal requested and queued for manual review. Process EcoCash or bank payouts after KYC/AML checks."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create withdrawal request.";
    return res.status(400).json({ error: message });
  }
});
