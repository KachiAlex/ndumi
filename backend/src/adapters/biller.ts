// ── Biller adapter interface ────────────────────────────────────────
// Implementations: mock, Paga, Quickteller, direct disco APIs.

export interface BillPaymentRequest {
  customerId: string;
  biller: string;
  accountNumber: string;
  amount: number;
}

export interface BillPaymentResult {
  paymentId: string;
  biller: string;
  accountNumber: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  newBalance: number;
}

export interface BillerAdapter {
  /** Pay a bill. */
  payBill(req: BillPaymentRequest): Promise<BillPaymentResult>;
  /** List supported billers. */
  listBillers(): Promise<Array<{ code: string; name: string }>>;
  /** Validate a customer's account with a biller. */
  validateAccount(biller: string, accountNumber: string): Promise<{ valid: boolean; name?: string }>;
}
