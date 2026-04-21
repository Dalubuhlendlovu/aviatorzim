import { Paynow } from "paynow";
import { env } from "./env.js";

export const paynow = new Paynow(
  env.PAYNOW_INTEGRATION_ID,
  env.PAYNOW_INTEGRATION_KEY,
  env.PAYNOW_RESULT_URL,
  env.PAYNOW_RETURN_URL
);

paynow.resultUrl = env.PAYNOW_RESULT_URL;
paynow.returnUrl = env.PAYNOW_RETURN_URL;
