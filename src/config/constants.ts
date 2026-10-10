/**
 * Shared constants and pure rules for TechSpardha 2K26.
 * Used by the registration form and the admin dashboard.
 * The server re-validates every rule here; this file only gives instant feedback.
 * Keep these rules in sync with the Apps Script backend (v1.4) CONFIG block.
 */
import type { Person } from '@/src/services/api';

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

/** The ONE place the UPI ID lives. Replace here when the final ID is ready. */
export const UPI_ID = '8447544699@ptsbi';
export const UPI_PAYEE_NAME = 'TechSpardha 2K26';
const UPI_NOTE = 'TechSpardha 2K26 Registration';

export function buildUpiLink(amount: number): string {
  return (
    `upi://pay?pa=${UPI_ID}` +
    `&pn=${encodeURIComponent(UPI_PAYEE_NAME)}` +
    `&am=${amount}&cu=INR` +
    `&tn=${encodeURIComponent(UPI_NOTE)}`
  );
}

export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024; // 2 MB (server limit is 3 MB)

// ---------------------------------------------------------------------------
// Identity rules
// ---------------------------------------------------------------------------

export const BRANCH_CODES = ['ASH', 'CSE', 'CS', 'IT', 'CSEAIML', 'BT', 'ME', 'ECE', 'MBA', 'MCA'] as const;

/** Branch codes allowed INSIDE a College ID. ASH is a form choice only, never part of an ID. */
export const ID_BRANCH_CODES = ['CSEAIML', 'CSE', 'CS', 'IT', 'BT', 'ME', 'ECE', 'MBA', 'MCA'] as const;
const ID_YEAR_PATTERN = '202[3-6]';

/** A + year 2023-2026 + branch code + 4-5 digits, e.g. A2024CSE1234. Change here only. */
export const COLLEGE_ID_REGEX = new RegExp(`^A${ID_YEAR_PATTERN}(?:${ID_BRANCH_CODES.join('|')})\\d{4,5}$`);
const COLLEGE_ID_LETTERS_REGEX = new RegExp(`^A\\d{4}(${ID_BRANCH_CODES.join('|')})\\d{4,5}$`);
export const COLLEGE_ID_EXAMPLE = 'A2024CSE1234';
export const COLLEGE_ID_HELP =
  `College ID must look like ${COLLEGE_ID_EXAMPLE}: A, a year from 2023 to 2026, a branch code (` +
  ID_BRANCH_CODES.join(', ') +
  ') and 4 or 5 digits.';

export const YEAR_OPTIONS = [
  { value: '1st', label: '1st Year' },
  { value: '2nd', label: '2nd Year' },
  { value: '3rd', label: '3rd Year' },
  { value: '4th', label: '4th Year' },
] as const;

const PG_BRANCHES = ['MBA', 'MCA'];
const FIRST_YEAR_BRANCHES = ['ASH', 'MBA', 'MCA'];

// Full name: English letters, spaces and . ' - only. Starts with a letter. No digits.
export const NAME_MIN = 2;
export const NAME_MAX = 60;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
export const NAME_HELP =
  "Full name must use English letters only (spaces and . ' - are allowed), start with a letter, have no numbers, and be 2 to 60 characters.";

export function isValidName(name: string): boolean {
  return (
    name.length >= NAME_MIN &&
    name.length <= NAME_MAX &&
    NAME_REGEX.test(name) &&
    name.replace(/[^A-Za-z]/g, '').length >= 2
  );
}

// Email: only these domains; the part before @ must start with a letter.
export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'imsec.ac.in'] as const;
const EMAIL_LOCAL_REGEX = /^[a-z](?:[a-z0-9._-]*[a-z0-9])?$/;
const EMAIL_LOCAL_MIN = 3;
const EMAIL_LOCAL_MAX = 64;
export const EMAIL_HINT = `Only @${ALLOWED_EMAIL_DOMAINS.join(' or @')} addresses are accepted.`;
export const EMAIL_HELP = `Email must be a @${ALLOWED_EMAIL_DOMAINS.join(' or @')} address, and the part before @ must start with a letter.`;

/** Pass the email already trimmed and lowercased. */
export function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!(ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain)) return false;
  if (local.length < EMAIL_LOCAL_MIN || local.length > EMAIL_LOCAL_MAX) return false;
  if (local.includes('..')) return false;
  return EMAIL_LOCAL_REGEX.test(local);
}

// ---------------------------------------------------------------------------
// Team name rules
// ---------------------------------------------------------------------------

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 40;
// First character an English letter; then letters, digits, spaces and - _ . & ' !
const TEAM_NAME_REGEX = /^[A-Za-z][A-Za-z0-9 _.&'!-]*$/;
/** Wait this long after the last keystroke before asking the server if the name is free. */
export const TEAM_NAME_CHECK_DEBOUNCE_MS = 600;
export const TEAM_NAME_HINT =
  "Must be unique across the whole fest. Start with a letter; then letters, numbers, spaces and - _ . & ' ! are allowed. Names that differ only in case, spaces or punctuation count as the same.";

/** Lowercase letters and digits only: "Team-A", "team a" and "TeamA" all become "teama". */
export function teamNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Returns an error message, or '' when the name's format is fine. Expects a trimmed, single-spaced name. */
export function teamNameFormatError(name: string): string {
  if (name.length < TEAM_NAME_MIN || name.length > TEAM_NAME_MAX) {
    return `Team name must be ${TEAM_NAME_MIN} to ${TEAM_NAME_MAX} characters.`;
  }
  if (!TEAM_NAME_REGEX.test(name)) {
    return "Team name must start with an English letter (A-Z). After that you can use letters, numbers, spaces and - _ . & ' !";
  }
  if (teamNameKey(name).length < 2) return 'Team name needs at least 2 letters or numbers.';
  return '';
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export const SLOT_GROUPS = [
  { slot: '1', title: 'Slot 1', note: 'Pick one event from this slot' },
  { slot: '2', title: 'Slot 2', note: 'Pick one event from this slot' },
  { slot: '3', title: 'Slot 3', note: 'All four events run at the same time' },
  { slot: 'TS', title: 'TechSnap', note: 'Runs on both days, outside the slots' },
] as const;

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

export const normalizeCollegeId = (v: string): string => v.trim().toUpperCase();

/** Same rule as the server: drop spaces, a leading +91 or 0; must be 10 digits starting 6-9. */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/\s+/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.startsWith('0')) s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

/** The branch letters inside a College ID ('' if the ID is not valid). */
export function idLetters(id: string): string {
  const m = COLLEGE_ID_LETTERS_REGEX.exec(normalizeCollegeId(id));
  return m ? m[1] : '';
}

// ---------------------------------------------------------------------------
// Branch / Year behaviour
// ---------------------------------------------------------------------------

export function suggestBranch(id: string, year: string): string {
  const letters = idLetters(id);
  if (year === '1st' && !PG_BRANCHES.includes(letters)) return 'ASH';
  return (BRANCH_CODES as readonly string[]).includes(letters) && letters !== 'ASH' ? letters : '';
}

/** Years a student may pick for a branch: ASH is locked to 1st, MBA/MCA only 1st-2nd. */
export function yearsForBranch(branch: string): string[] {
  if (branch === 'ASH') return ['1st'];
  if (PG_BRANCHES.includes(branch)) return ['1st', '2nd'];
  return YEAR_OPTIONS.map((y) => y.value);
}

export const emptyPerson = (): Person => ({ fullName: '', collegeId: '', email: '', phone: '', year: '', branch: '' });

/** Applies one field change and the automatic ASH / pre-fill rules. */
export function updatePerson(prev: Person, field: keyof Person, raw: string): Person {
  const next: Person = { ...prev, [field]: field === 'collegeId' ? raw.toUpperCase() : raw };

  if (field === 'collegeId') {
    const id = normalizeCollegeId(next.collegeId);
    if (!next.branch && COLLEGE_ID_REGEX.test(id)) next.branch = suggestBranch(id, next.year);
  }

  if (field === 'year') {
    if (raw === '1st' && !FIRST_YEAR_BRANCHES.includes(next.branch)) {
      next.branch = suggestBranch(next.collegeId, '1st');
    } else if (raw !== '1st' && next.branch === 'ASH') {
      next.branch = suggestBranch(next.collegeId, raw);
    }
  }

  if (field === 'branch') {
    if (raw === 'ASH') next.year = '1st';
    else if (PG_BRANCHES.includes(raw) && next.year && !['1st', '2nd'].includes(next.year)) next.year = '';
  }
  return next;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PersonErrors = Partial<Record<keyof Person, string>>;

export function validatePerson(p: Person): PersonErrors {
  const e: PersonErrors = {};

  const id = normalizeCollegeId(p.collegeId);
  if (!id) e.collegeId = 'College ID is required.';
  else if (!COLLEGE_ID_REGEX.test(id)) e.collegeId = COLLEGE_ID_HELP;

  const name = p.fullName.trim().replace(/\s+/g, ' ');
  if (!isValidName(name)) e.fullName = NAME_HELP;

  const email = p.email.trim().toLowerCase();
  if (!email) e.email = 'Email is required.';
  else if (!isValidEmail(email)) e.email = EMAIL_HELP;

  if (!normalizePhone(p.phone)) e.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';

  if (!p.year) e.year = 'Select the current year.';
  if (!p.branch) e.branch = 'Select the branch.';

  if (p.year && p.branch) {
    if (p.branch === 'ASH' && p.year !== '1st') e.branch = 'ASH is only for 1st year students.';
    else if (p.year === '1st' && !FIRST_YEAR_BRANCHES.includes(p.branch)) {
      e.branch = '1st year students must choose ASH (MBA and MCA students choose MBA or MCA).';
    }
    if (PG_BRANCHES.includes(p.branch) && p.year !== '1st' && p.year !== '2nd') {
      e.year = 'MBA and MCA students can only be 1st or 2nd year.';
    }
  }
  return e;
}

/** Cleans a person for sending to the server. */
export function toApiPerson(p: Person): Person {
  return {
    fullName: p.fullName.trim().replace(/\s+/g, ' '),
    collegeId: normalizeCollegeId(p.collegeId),
    email: p.email.trim().toLowerCase(),
    phone: normalizePhone(p.phone) ?? p.phone.trim(),
    year: p.year,
    branch: p.branch,
  };
}