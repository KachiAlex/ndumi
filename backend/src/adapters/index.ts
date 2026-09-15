export type { BankingAdapter, BankAccount, BankTransaction } from "./banking.js";
export type { PaymentAdapter, TransferRequest, TransferResult } from "./payment.js";
export type { TelcoAdapter, AirtimeRequest, AirtimeResult } from "./telco.js";
export type { BillerAdapter, BillPaymentRequest, BillPaymentResult } from "./biller.js";
export type { OtpAdapter } from "./otp.js";
export { mockOtpAdapter, getOtpAdapter, registerBankingAdapter, registerPaymentAdapter, registerTelcoAdapter, registerBillerAdapter } from "./otp.js";
