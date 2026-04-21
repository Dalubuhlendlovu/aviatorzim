import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __aviatorPrisma__: PrismaClient | undefined;
}

export const prisma = globalThis.__aviatorPrisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__aviatorPrisma__ = prisma;
}
