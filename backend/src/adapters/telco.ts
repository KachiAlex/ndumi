// ── Telco recharge adapter interface ─────────────────────────────────
// Implementations: mock, MTN VTU, Glo, Airtel, 9mobile, Reloadly.

export interface AirtimeRequest {
  customerId: string;
  phoneNumber: string;
  amount: number;
  network: string;
}

export interface AirtimeResult {
  rechargeId: string;
  phoneNumber: string;
  network: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  newBalance: number;
}

export interface TelcoAdapter {
  /** Buy airtime for a phone number. */
  buyAirtime(req: AirtimeRequest): Promise<AirtimeResult>;
  /** List supported networks. */
  listNetworks(): Promise<Array<{ code: string; name: string }>>;
  /** Validate a phone number for a given network. */
  validateNumber(phoneNumber: string, network: string): Promise<{ valid: boolean }>;
}
