const BRAZIL_COUNTRY_CODE = '55';
/** 0800/0300/0500/0900 service numbers have no area code and keep their original format. */
const NON_GEOGRAPHIC_PREFIX = /^0[3589]00/;
const EXPLICIT_COUNTRY_CODE = /^\+\s*55/;

function formatNationalDigits(digits: string): string {
  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  return `(${areaCode}) ${subscriber.slice(0, -4)}-${subscriber.slice(-4)}`;
}

/**
 * Normalizes Brazilian numbers to "(DD) NNNNN-NNNN". Removing the leading "+" also keeps
 * spreadsheet apps from interpreting the cell as a formula.
 */
export function normalizeBrazilianPhone(raw: string): string {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (NON_GEOGRAPHIC_PREFIX.test(digits)) {
    return trimmed;
  }
  const hasExplicitCountryCode = EXPLICIT_COUNTRY_CODE.test(trimmed);
  if (hasExplicitCountryCode && !(digits.length === 12 || digits.length === 13)) {
    // "+55" with the wrong digit count is malformed source data: never reinterpret 55 as DDD.
    return trimmed;
  }
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
  }
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }
  return digits.length === 10 || digits.length === 11 ? formatNationalDigits(digits) : trimmed;
}
