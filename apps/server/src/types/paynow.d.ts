declare module "paynow" {
  export class Payment {
    constructor(reference: string, authEmail?: string);
    add(title: string, amount: number): void;
  }

  export class InitResponse {
    success: boolean;
    hasRedirect: boolean;
    redirectUrl?: string;
    error?: string;
    pollUrl: string;
    instructions?: string;
    status: string;
  }

  export class StatusResponse {
    reference: string;
    amount: string;
    paynowReference: string;
    pollUrl: string;
    status: string;
    error?: string;
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string, resultUrl: string, returnUrl: string);
    integrationId: string;
    integrationKey: string;
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string, authEmail: string): Payment;
    send(payment: Payment): Promise<InitResponse | undefined>;
    sendMobile(payment: Payment, phone: string, method: string): Promise<InitResponse | undefined>;
    pollTransaction(url: string): Promise<InitResponse | undefined>;
    parseStatusUpdate(response: string): StatusResponse;
  }
}
