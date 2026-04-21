import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { authenticateUser, createUser, findUserByEmail } from "../lib/account-repository.js";

const signupSchema = z.object({
  fullName: z.string().min(3),
  address: z.string().min(5),
  phoneNumber: z.string().min(7),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const user = await createUser(parsed.data);

  return res.status(201).json({
    token: signToken(user.profile.id),
    user: {
      ...user.profile,
      email: user.contactEmail
    }
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  return res.json({
    token: signToken(user.profile.id),
    user: {
      ...user.profile,
      email: user.contactEmail
    }
  });
});
