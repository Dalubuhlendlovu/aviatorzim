import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findUserById } from "../lib/account-repository.js";

interface TokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

function getBearerToken(headerValue?: string) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Authentication failed." });
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: "Administrator access required." });
  }

  return next();
}
