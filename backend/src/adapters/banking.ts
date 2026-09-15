// ── Banking provider adapter interface ─────────────────────────────
// Implementations: mock (customerStore), or real core-banking APIs.

export interface BankAccount {
  accountId: string;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface BankTransaction {
  id: string;
  type: "credit" | "debit" | "airtime" | "bill";
  description: string;
  amount: number;
  date: string;
}

export interface BankingAdapter {
  /** Look up a customer by phone number. */
  lookupCustomer(phone: string): Promise<BankAccount | null>;
  /** Verify a customer's PIN. Returns the account if valid. */
  verifyPin(phone: string, pin: string): Promise<BankAccount | null>;
  /** Get account details. */
  getAccount(customerId: string): Promise<BankAccount | null>;
  /** Get account balance. */
  getBalance(customerId: string): Promise<{ balance: number; currency: string } | null>;
  /** Get recent transactions. */
  getTransactions(customerId: string, limit?: number): Promise<BankTransaction[]>;
  /** Record a debit and return the new balance. */
  debit(customerId: string, amount: number, description: string): Promise<{ txnId: string; newBalance: number } | null>;
  /** Check if the account has sufficient balance. */
  hasSufficientBalance(customerId: string, amount: number): Promise<boolean>;
}
