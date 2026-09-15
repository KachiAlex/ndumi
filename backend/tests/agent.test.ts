import { describe, it, expect } from "vitest";
import { extractPhoneNumber, extractPin, lookupCustomer, verifyPin } from "../src/agent/customerStore.js";
import { isAffirmative, isNegative } from "../src/agent/guardrails.js";
import { nairaToWords, numberToWords } from "../src/agent/n2w.js";
import { getTenant, BANKING_TENANT } from "../src/agent/tenantConfig.js";

describe("Customer Store", () => {
  it("should look up a customer by phone number", () => {
    const customer = lookupCustomer("08012345678");
    expect(customer).not.toBeNull();
    expect(customer!.name).toBe("Chiamaka Okafor");
    expect(customer!.balance).toBe(247500);
  });

  it("should return null for unknown phone numbers", () => {
    expect(lookupCustomer("08000000000")).toBeNull();
  });

  it("should verify a correct PIN", () => {
    const customer = verifyPin("08012345678", "1234");
    expect(customer).not.toBeNull();
    expect(customer!.name).toBe("Chiamaka Okafor");
  });

  it("should reject an incorrect PIN", () => {
    expect(verifyPin("08012345678", "9999")).toBeNull();
  });
});

describe("Phone Number Extraction", () => {
  it("should extract 11-digit Nigerian numbers", () => {
    expect(extractPhoneNumber("my number is 08012345678")).toBe("08012345678");
  });

  it("should extract from various formats", () => {
    expect(extractPhoneNumber("080-123-45678")).toBe("08012345678");
    expect(extractPhoneNumber("+2348012345678")).toBe("08012345678");
  });

  it("should return null for invalid input", () => {
    expect(extractPhoneNumber("hello world")).toBeNull();
  });
});

describe("PIN Extraction", () => {
  it("should extract 4-digit PINs", () => {
    expect(extractPin("my pin is 1234")).toBe("1234");
    expect(extractPin("5678")).toBe("5678");
  });

  it("should return null for invalid input", () => {
    expect(extractPin("hello")).toBeNull();
  });
});

describe("Affirmation Detection", () => {
  it("should detect English affirmations", () => {
    expect(isAffirmative("yes")).toBe(true);
    expect(isAffirmative("yeah")).toBe(true);
    expect(isAffirmative("confirm")).toBe(true);
    expect(isAffirmative("go ahead")).toBe(true);
  });

  it("should detect Pidgin affirmations", () => {
    expect(isAffirmative("yes o")).toBe(true);
    expect(isAffirmative("abeg do am")).toBe(true);
  });

  it("should not false-positive on negations", () => {
    expect(isAffirmative("no")).toBe(false);
    expect(isAffirmative("cancel")).toBe(false);
    expect(isAffirmative("abeg no")).toBe(false);
  });
});

describe("Negation Detection", () => {
  it("should detect English negations", () => {
    expect(isNegative("no")).toBe(true);
    expect(isNegative("cancel")).toBe(true);
    expect(isNegative("don't do it")).toBe(true);
  });

  it("should detect Pidgin negations", () => {
    expect(isNegative("abeg no")).toBe(true);
    expect(isNegative("no do am")).toBe(true);
  });
});

describe("Currency Number-to-Words", () => {
  it("should convert simple amounts", () => {
    expect(nairaToWords(1000)).toBe("one thousand naira");
    expect(nairaToWords(5000)).toBe("five thousand naira");
    expect(nairaToWords(100)).toBe("one hundred naira");
  });

  it("should convert complex amounts", () => {
    expect(nairaToWords(247500)).toBe("two hundred and forty seven thousand five hundred naira");
    expect(nairaToWords(1000000)).toBe("one million naira");
  });

  it("should handle zero", () => {
    expect(nairaToWords(0)).toBe("zero naira");
  });
});

describe("Tenant Config", () => {
  it("should return banking tenant by default", () => {
    const tenant = getTenant("banking");
    expect(tenant.id).toBe("banking");
    expect(tenant.enabledTools).toContain("check_balance");
    expect(tenant.enabledTools).toContain("make_transfer");
  });

  it("should fall back to banking for unknown tenants", () => {
    const tenant = getTenant("unknown");
    expect(tenant.id).toBe("banking");
  });

  it("should have transaction limits configured", () => {
    expect(BANKING_TENANT.guardrails.transactionLimits).toBeDefined();
    expect(BANKING_TENANT.guardrails.transactionLimits!.make_transfer).toBe(500000);
    expect(BANKING_TENANT.guardrails.transactionLimits!.recharge_airtime).toBe(10000);
  });

  it("should have system prompts for all languages", () => {
    for (const lang of ["ig", "yo", "ha", "pcm", "en"] as const) {
      expect(BANKING_TENANT.systemPrompts[lang]).toBeTruthy();
      expect(BANKING_TENANT.systemPrompts[lang].length).toBeGreaterThan(50);
    }
  });
});
