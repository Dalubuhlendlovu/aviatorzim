import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16).default("replace-with-a-long-random-secret"),
  PAYNOW_INTEGRATION_ID: z.string().default("replace-me"),
  PAYNOW_INTEGRATION_KEY: z.string().default("replace-me"),
  PAYNOW_RESULT_URL: z.string().url().default("http://localhost:4000/api/payments/result"),
  PAYNOW_RETURN_URL: z.string().url().default("http://localhost:3000/payment/success"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/aviatorzim")
});

export const env = envSchema.parse(process.env);
