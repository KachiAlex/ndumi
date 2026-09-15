// ── Payment rails adapter interface ──────────────────────────────────
// Implementations: mock, Paystack, Flutterwave, Mono, NIP direct.

export interface TransferRequest {
  customerId: string;
  recipientAccount: string;
  bankCode: string;
  amount: number;
  narration?: string;
}

export interface TransferResult {
  transferId: string;
  recipientAccount: string;
  bank: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  newBalance: number;
}

export interface PaymentAdapter {
  /** Execute a bank transfer. */
  transfer(req: TransferRequest): Promise<TransferResult>;
  /** List supported banks. */
  listBanks(): Promise<Array<{ code: string; name: string }>>;
  /** Validate a recipient account number. */
  validateAccount(accountNumber: string, bankCode: string): Promise<{ valid: boolean; name?: string }>;
}
