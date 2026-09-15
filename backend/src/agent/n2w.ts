/**
 * Convert a number to spoken-English words, suitable for TTS.
 * Optimized for Nigerian currency (Naira) but works for any number.
 *
 * Examples:
 *   5000  -> "five thousand"
 *   247500 -> "two hundred and forty seven thousand five hundred"
 *   100   -> "one hundred"
 */

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];

const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} hundred`);
  if (rest > 0) parts.push(rest < 20 ? ONES[rest] : twoDigits(rest));
  return parts.join(" and ");
}

export function numberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `minus ${numberToWords(-n)}`;

  const billion = Math.floor(n / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (billion > 0) parts.push(`${threeDigits(billion)} billion`);
  if (million > 0) parts.push(`${threeDigits(million)} million`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} thousand`);
  if (rest > 0) parts.push(threeDigits(rest));

  return parts.join(" ");
}

/** Format an amount as spoken Naira, e.g. 5000 -> "five thousand naira" */
export function nairaToWords(n: number): string {
  const words = numberToWords(Math.floor(n));
  const kobo = Math.round((n - Math.floor(n)) * 100);
  let result = `${words} naira`;
  if (kobo > 0) result += ` and ${numberToWords(kobo)} kobo`;
  return result;
}
