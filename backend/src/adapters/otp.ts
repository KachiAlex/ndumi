// ── SMS/OTP provider adapter interface ──────────────────────────────
// Implementations: mock, Termii, Twilio, African SMS gateway.

export interface OtpAdapter {
  /** Send an OTP to a phone number. Returns the OTP (mock) or a send reference. */
  sendOtp(phoneNumber: string): Promise<{ sent: boolean; reference?: string; otp?: string }>;
  /** Verify an OTP against a phone number. */
  verifyOtp(phoneNumber: string, otp: string): Promise<{ valid: boolean }>;
}

// ── Mock OTP adapter ────────────────────────────────────────────────
// In dev: generates a fixed OTP "1234" for any number.
// In production: would integrate with Termii/Twilio.

class MockOtpAdapter implements OtpAdapter {
  async sendOtp(phoneNumber: string): Promise<{ sent: boolean; reference?: string; otp?: string }> {
    console.log(`[OTP] Mock OTP sent to ${phoneNumber}: 1234`);
    return { sent: true, reference: `mock-${Date.now()}`, otp: "1234" };
  }

  async verifyOtp(_phoneNumber: string, otp: string): Promise<{ valid: boolean }> {
    return { valid: otp === "1234" };
  }
}

export const mockOtpAdapter = new MockOtpAdapter();

// ── Adapter registry ─────────────────────────────────────────────────
// Resolves adapter implementations by name from tenant config.

import type { BankingAdapter } from "./banking.js";
import type { PaymentAdapter } from "./payment.js";
import type { TelcoAdapter } from "./telco.js";
import type { BillerAdapter } from "./biller.js";

// Mock implementations are wired in executor.ts via customerStore.
// Real implementations would be registered here.

const otpAdapters: Record<string, OtpAdapter> = {
  mock: mockOtpAdapter,
};

export function getOtpAdapter(name: string): OtpAdapter {
  return otpAdapters[name] || otpAdapters.mock;
}

// Placeholder registries for real adapter wiring (Phase 6 real integrations)
export const bankingAdapters: Record<string, BankingAdapter> = {};
export const paymentAdapters: Record<string, PaymentAdapter> = {};
export const telcoAdapters: Record<string, TelcoAdapter> = {};
export const billerAdapters: Record<string, BillerAdapter> = {};

export function registerBankingAdapter(name: string, adapter: BankingAdapter): void {
  bankingAdapters[name] = adapter;
}
export function registerPaymentAdapter(name: string, adapter: PaymentAdapter): void {
  paymentAdapters[name] = adapter;
}
export function registerTelcoAdapter(name: string, adapter: TelcoAdapter): void {
  telcoAdapters[name] = adapter;
}
export function registerBillerAdapter(name: string, adapter: BillerAdapter): void {
  billerAdapters[name] = adapter;
}
