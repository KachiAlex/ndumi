// ── Mock customer database ──────────────────────────────────────────
// In production this would be a real core banking API lookup.
// For the mock, we have a small set of test customers.

export interface CustomerRecord {
  phone: string;
  pin: string;
  name: string;
  accountId: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface TransactionRecord {
  id: string;
  type: "credit" | "debit" | "airtime" | "bill";
  description: string;
  amount: number;
  date: string;
  balanceAfter: number;
}

// Test customers — phone → account data
const CUSTOMERS: Record<string, CustomerRecord> = {
  "08012345678": {
    phone: "08012345678",
    pin: "1234",
    name: "Chiamaka Okafor",
    accountId: "0123456789",
    accountType: "Savings",
    balance: 247500,
    currency: "NGN",
  },
  "08087654321": {
    phone: "08087654321",
    pin: "5678",
    name: "Emeka Nwosu",
    accountId: "9876543210",
    accountType: "Current",
    balance: 890000,
    currency: "NGN",
  },
  "07011223344": {
    phone: "07011223344",
    pin: "9999",
    name: "Aisha Mohammed",
    accountId: "4455667788",
    accountType: "Savings",
    balance: 53000,
    currency: "NGN",
  },
};

// Per-customer transaction history (seeded)
const TRANSACTIONS: Record<string, TransactionRecord[]> = {
  "08012345678": [
    { id: "TXN-001", type: "credit", description: "Salary - Acme Corp", amount: 350000, date: "2026-09-10", balanceAfter: 597500 },
    { id: "TXN-002", type: "debit", description: "Transfer to 08087654321 (GTB)", amount: 150000, date: "2026-09-12", balanceAfter: 447500 },
    { id: "TXN-003", type: "airtime", description: "MTN Airtime - 08012345678", amount: 2000, date: "2026-09-13", balanceAfter: 445500 },
    { id: "TXN-004", type: "bill", description: "Ikeja Electric - Meter 044123", amount: 15000, date: "2026-09-14", balanceAfter: 430500 },
    { id: "TXN-005", type: "debit", description: "POS Purchase - Shoprite", amount: 183000, date: "2026-09-14", balanceAfter: 247500 },
  ],
  "08087654321": [
    { id: "TXN-101", type: "credit", description: "Freelance payment", amount: 500000, date: "2026-09-11", balanceAfter: 940000 },
    { id: "TXN-102", type: "debit", description: "Rent payment", amount: 50000, date: "2026-09-13", balanceAfter: 890000 },
  ],
  "07011223344": [
    { id: "TXN-201", type: "credit", description: "Pocket money", amount: 30000, date: "2026-09-12", balanceAfter: 53000 },
  ],
};

// ── Public API ──────────────────────────────────────────────────────

/** Look up a customer by phone number. Returns null if not found. */
export function lookupCustomer(phone: string): CustomerRecord | null {
  // Normalize: strip spaces, dashes, leading +234/234
  const normalized = phone.replace(/[\s\-]/g, "").replace(/^(\+?234)/, "");
  return CUSTOMERS[normalized] || null;
}

/** Verify a customer's PIN. Returns the customer record if valid, null otherwise. */
export function verifyPin(phone: string, pin: string): CustomerRecord | null {
  const customer = lookupCustomer(phone);
  if (!customer) return null;
  return customer.pin === pin ? customer : null;
}

/** Get the customer's current account data. */
export function getCustomer(customerId: string): CustomerRecord | null {
  return CUSTOMERS[customerId] || null;
}

/** Get the customer's transaction history. */
export function getCustomerTransactions(customerId: string, limit = 5): TransactionRecord[] {
  return (TRANSACTIONS[customerId] || []).slice(0, limit);
}

/** Record a new transaction and update balance. */
export function recordTransaction(
  customerId: string,
  type: TransactionRecord["type"],
  description: string,
  amount: number,
): TransactionRecord | null {
  const customer = CUSTOMERS[customerId];
  if (!customer) return null;

  customer.balance -= amount;
  const txn: TransactionRecord = {
    id: `TXN-${Date.now().toString(36).toUpperCase()}`,
    type,
    description,
    amount,
    date: new Date().toISOString().slice(0, 10),
    balanceAfter: customer.balance,
  };
  if (!TRANSACTIONS[customerId]) TRANSACTIONS[customerId] = [];
  TRANSACTIONS[customerId].unshift(txn);
  return txn;
}

/** Check if the customer has sufficient balance. */
export function hasSufficientBalance(customerId: string, amount: number): boolean {
  const customer = CUSTOMERS[customerId];
  return customer ? customer.balance >= amount : false;
}

/** Mask an account number for display: 012****789 */
export function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return `${account.slice(0, 3)}****${account.slice(-3)}`;
}

/** Extract a phone number from spoken text. Handles various formats. */
export function extractPhoneNumber(text: string): string | null {
  // Strip everything except digits
  const digits = text.replace(/\D/g, "");
  // Nigerian numbers: 11 digits starting with 0, or 13 with 234 prefix
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("234")) return "0" + digits.slice(3);
  // Sometimes ASR adds extra digits — try to find an 11-digit substring
  const match = text.match(/0\d{10}/);
  if (match) return match[0];
  return null;
}

/** Extract a PIN (4 digits) from spoken text. */
export function extractPin(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 4) return digits;
  // ASR might say "one two three four" → already handled by digit extraction
  // or it might say "1234" as a single number
  if (digits.length >= 4 && digits.length <= 6) return digits.slice(0, 4);
  return null;
}
