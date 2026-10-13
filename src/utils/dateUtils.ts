const MONTHS_FULL_UPPER = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Formats any date string, timestamp, or Date object into the official Civil Registry format:
 * DD MMM YYYY (e.g. 05 OCTOBER 2026)
 */
export function formatDateDDMMMYYYY(input: string | number | Date | undefined | null): string {
  if (input === null || input === undefined) return 'N/A';

  // Handle numeric timestamp or epoch number
  if (typeof input === 'number') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTHS_FULL_UPPER[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return 'N/A';
  }

  // Handle Date instance
  if (input instanceof Date) {
    if (!isNaN(input.getTime())) {
      const day = String(input.getDate()).padStart(2, '0');
      const month = MONTHS_FULL_UPPER[input.getMonth()];
      const year = input.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return 'N/A';
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'null') {
      return 'N/A';
    }

    // Epoch timestamp string (e.g. '1788423261655')
    if (/^\d{12,14}$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = MONTHS_FULL_UPPER[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
    }

    // Already in DD MONTH YYYY format (e.g. '05 OCTOBER 2026' or '5 October 2026')
    const ddMonthYyyyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (ddMonthYyyyMatch) {
      const day = ddMonthYyyyMatch[1].padStart(2, '0');
      const monthKey = ddMonthYyyyMatch[2].toLowerCase();
      const monthIdx = MONTH_NAME_MAP[monthKey];
      const year = ddMonthYyyyMatch[3];
      if (monthIdx !== undefined) {
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
      return `${day} ${ddMonthYyyyMatch[2].toUpperCase()} ${year}`;
    }

    // Format Month DD, YYYY (e.g. 'October 5, 2026' or 'Oct 05, 2026')
    const monthDdYyyyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
    if (monthDdYyyyMatch) {
      const monthKey = monthDdYyyyMatch[1].toLowerCase();
      const monthIdx = MONTH_NAME_MAP[monthKey];
      const day = monthDdYyyyMatch[2].padStart(2, '0');
      const year = monthDdYyyyMatch[3];
      if (monthIdx !== undefined) {
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
    }

    // Format YYYY-Month-DD or YYYY/Month/DD with alphabetic month (e.g. '2026-OCTOBER-05' or '2026-Feb-3')
    const ymdNamedMatch = trimmed.match(/^(\d{4})[-/]([A-Za-z]+)[-/](\d{1,2})/);
    if (ymdNamedMatch) {
      const year = ymdNamedMatch[1];
      const monthKey = ymdNamedMatch[2].toLowerCase();
      const monthIdx = MONTH_NAME_MAP[monthKey];
      const day = ymdNamedMatch[3].padStart(2, '0');
      if (monthIdx !== undefined) {
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
    }

    // Format DD-Month-YYYY or DD/Month/YYYY with alphabetic month (e.g. '05-OCTOBER-2026')
    const dmyNamedMatch = trimmed.match(/^(\d{1,2})[-/]([A-Za-z]+)[-/](\d{4})/);
    if (dmyNamedMatch) {
      const day = dmyNamedMatch[1].padStart(2, '0');
      const monthKey = dmyNamedMatch[2].toLowerCase();
      const monthIdx = MONTH_NAME_MAP[monthKey];
      const year = dmyNamedMatch[3];
      if (monthIdx !== undefined) {
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
    }

    // Match YYYY-MM-DD or YYYY-M-D (with optional time or ISO timestamp)
    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const monthIdx = parseInt(ymdMatch[2], 10) - 1;
      const day = ymdMatch[3].padStart(2, '0');
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
    }

    // Match DD-MM-YYYY or MM-DD-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const num1 = parseInt(dmyMatch[1], 10);
      const num2 = parseInt(dmyMatch[2], 10);
      const year = dmyMatch[3];

      if (num1 > 12 && num2 >= 1 && num2 <= 12) {
        // Definitely DD-MM-YYYY
        const day = String(num1).padStart(2, '0');
        const monthIdx = num2 - 1;
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      } else if (num2 > 12 && num1 >= 1 && num1 <= 12) {
        // Definitely MM-DD-YYYY
        const day = String(num2).padStart(2, '0');
        const monthIdx = num1 - 1;
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      } else if (num1 >= 1 && num1 <= 31 && num2 >= 1 && num2 <= 12) {
        // Default to DD-MM-YYYY in Philippine Civil Registry context
        const day = String(num1).padStart(2, '0');
        const monthIdx = num2 - 1;
        return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
      }
    }

    // Native Date parsing fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // Avoid timezone shifting on dates without time
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, '0');
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${MONTHS_FULL_UPPER[monthIdx]} ${year}`;
        }
      }
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = MONTHS_FULL_UPPER[parsed.getMonth()];
      const year = parsed.getFullYear();
      return `${day} ${month} ${year}`;
    }

    return trimmed;
  }

  return 'N/A';
}

/**
 * Converts any date representation (e.g. '05 OCTOBER 2026', '2026-10-05T00:00:00Z', etc.)
 * into standard YYYY-MM-DD string required by HTML <input type="date"> fields.
 */
export function toInputDateValue(input: string | number | Date | undefined | null): string {
  if (input === null || input === undefined) return '';
  const formatted = formatDateDDMMMYYYY(input);
  if (!formatted || formatted === 'N/A') return '';
  const m = formatted.match(/^(\d{2})\s+([A-Z]+)\s+(\d{4})$/);
  if (m) {
    const day = m[1];
    const monthIdx = MONTHS_FULL_UPPER.indexOf(m[2]);
    if (monthIdx >= 0) {
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const year = m[3];
      return `${year}-${monthStr}-${day}`;
    }
  }
  return '';
}

/**
 * Formats a date and time for audit logs and system timestamps:
 * e.g. 05 OCTOBER 2026, 09:30 AM
 */
export function formatDateTimeDDMMMYYYY(input: string | number | Date | undefined | null): string {
  if (!input) return 'N/A';
  const str = String(input).trim();
  const dateFormatted = formatDateDDMMMYYYY(input);
  if (dateFormatted === 'N/A') return 'N/A';

  // Check if there is an explicit time component in string (e.g. '09:30:00' or '10:00 AM')
  const timeMatch = str.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/);
  if (timeMatch) {
    return `${dateFormatted} • ${timeMatch[1]}`;
  }

  return dateFormatted;
}
