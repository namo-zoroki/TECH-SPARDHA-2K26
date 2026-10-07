/**
 * TECHSPARDHA 2K26 - Backend (Google Apps Script) - v1.1
 *
 * Implements TechSpardha_Registration_Spec.md plus the final decisions:
 *  - Gamer Fiesta is ONE event with per-game team sizes (Events.GameSizes).
 *  - Year 1st MUST choose ASH (MBA/MCA excepted). ASH locks Year to 1st.
 *  - Team name optional for a 1-member registration.
 *
 * v1.1 CHANGE: per-admin logins.
 *  - Each admin has their own Admin ID + password, kept in an "Admins" tab of a
 *    SEPARATE, owner-only spreadsheet (NOT the core-team spreadsheet).
 *  - The server decides the admin's name from the sheet. The browser never sends it.
 *  - Lockout is per Admin ID. Disabling an admin (Active = FALSE) works on their next request.
 *  - Admin_Log has the same columns as before. Actor is written as "Name (adminid)".
 *  - Exports, copy-emails and screenshot views are now logged.
 *
 * SETUP (once):
 *  1. appsscript.json: set "timeZone": "Asia/Kolkata".
 *  2. Create a NEW spreadsheet that only the 1-2 owners can open (the admin sheet).
 *     Copy its ID from the URL.
 *  3. Project Settings -> Script Properties, add:
 *       ADMIN_SHEET_ID   (ID of that owner-only spreadsheet)
 *       DRIVE_FOLDER_ID  (PRIVATE folder for payment screenshots)
 *     The old ADMIN_PASSWORD property is no longer used. Delete it.
 *  4. Run setup() once (safe to re-run; it never deletes data, resets counters or overwrites admins).
 *  5. In the owner-only spreadsheet, tab "Admins", add one row per admin:
 *       AdminID | Name | Password | Active
 *     Password: random, 12+ characters. Active: TRUE or FALSE.
 *  6. Deploy -> Manage deployments -> edit the existing deployment -> New version.
 *     Execute as: Me. Who has access: Anyone.
 *
 * Public actions: get_events, register (+ a health check on GET).
 * Everything else needs an admin session token.
 */

// ============================================================
// CONFIG
// ============================================================
const TZ = 'Asia/Kolkata';
const SESSION_TTL_SEC = 2 * 60 * 60;
const IDEM_TTL_SEC = 6 * 60 * 60;
const LOCK_WAIT_MS = 30000;
const THROTTLE_MAX = 5;
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_LOCK_SEC = 15 * 60;
const MAX_BODY_CHARS = 4600000;
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const MAX_TEAM_MEMBERS = 20;
const BACKUPS_TO_KEEP = 7;
const MIN_SHEET_ROWS = 3000;

// Admin accounts (live in a separate owner-only spreadsheet, tab below).
const ADMINS_TAB = 'Admins';
const ADMIN_HEADERS = ['AdminID', 'Name', 'Password', 'Active'];
const ADMIN_ID_REGEX = /^[a-z0-9_.-]{2,40}$/;
const MIN_ADMIN_PASSWORD_LEN = 12;
const EXPORT_KINDS = ['registrations_csv', 'contacts_csv', 'copy_all_emails', 'copy_captain_emails'];

// College ID: A + 4-digit year + 2-7 letters + 4-5 digits. Change here only.
const COLLEGE_ID_REGEX = /^A\d{4}[A-Z]{2,7}\d{4,5}$/;
const COLLEGE_ID_LETTERS_REGEX = /^A\d{4}([A-Z]{2,7})\d{4,5}$/;
const BRANCHES = ['ASH', 'CSE', 'CS', 'IT', 'CSEAIML', 'BT', 'ME', 'ECE', 'MBA', 'MCA'];
const YEARS = ['1st', '2nd', '3rd', '4th'];
const SLOTS = ['1', '2', '3', 'TS'];
const SLOT_COLUMN = { '1': 'Slot1', '2': 'Slot2', '3': 'Slot3', 'TS': 'TechSnap' };
const SLOT_LABEL = { '1': 'Slot 1', '2': 'Slot 2', '3': 'Slot 3', 'TS': 'TechSnap' };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENERIC_ERR = 'Something went wrong on the server. Nothing was saved. Please try again.';

const S = {
  EVENTS: 'Events',
  REGS: 'Registrations',
  MEMBERS: 'Team_Members',
  PARTS: 'Participants',
  PAYS: 'Payments',
  LOG: 'Admin_Log',
  CONTACTS: 'Contacts'
};

const HEADERS = {
  Events: ['EventID', 'Name', 'Slot', 'TeamMin', 'TeamMax', 'Games', 'GameSizes', 'Fee', 'Open', 'TotalReg'],
  Registrations: ['RegID', 'Timestamp', 'EventID', 'TeamName', 'Game', 'CaptainID', 'TeamSize', 'Status', 'UpdatedAt'],
  Team_Members: ['RegID', 'CollegeID', 'Role', 'Active'],
  Participants: ['CollegeID', 'FullName', 'Email', 'Phone', 'Year', 'Branch', 'Slot1', 'Slot2', 'Slot3', 'TechSnap', 'Flags', 'CreatedAt'],
  Payments: ['PaymentID', 'RegID', 'UTR', 'Amount', 'Status', 'ScreenshotURL', 'SubmittedAt', 'VerifiedBy', 'VerifiedAt', 'Note'],
  Admin_Log: ['Timestamp', 'Actor', 'Action', 'RegID', 'Detail']
};

// Columns that must stay plain text (IDs, phones, UTRs, timestamps...).
const TEXT_COLUMNS = {
  Events: ['EventID', 'Name', 'Slot', 'Games', 'GameSizes'],
  Registrations: ['RegID', 'Timestamp', 'EventID', 'TeamName', 'Game', 'CaptainID', 'Status', 'UpdatedAt'],
  Team_Members: ['RegID', 'CollegeID', 'Role'],
  Participants: ['CollegeID', 'FullName', 'Email', 'Phone', 'Year', 'Branch', 'Slot1', 'Slot2', 'Slot3', 'TechSnap', 'Flags', 'CreatedAt'],
  Payments: ['PaymentID', 'RegID', 'UTR', 'Status', 'ScreenshotURL', 'SubmittedAt', 'VerifiedBy', 'VerifiedAt', 'Note'],
  Admin_Log: ['Timestamp', 'Actor', 'Action', 'RegID', 'Detail']
};

// Seed for the Events tab. Only used when the tab has no event rows yet.
// The IDs match the final table in the handoff (Gamer Fiesta keeps '08').
const EVENT_SEED = [
  ['01', 'CodeDecode 2.0', '1', 1, 2, '', '', 0, true],
  ['02', 'RoboRace 2.0', '1', 2, 4, '', '', 0, true],
  ['03', 'Ideathon', '1', 2, 4, '', '', 0, true],
  ['04', 'AI Build Arena', '2', 2, 4, '', '', 0, true],
  ['05', 'UI/UX Blitz', '2', 1, 2, '', '', 0, true],
  ['08', 'Gamer Fiesta 2.0', '2', 4, 5, 'Valorant, BGMI, Free Fire', 'Valorant:5, BGMI:4, Free Fire:4', 200, false],
  ['06', 'Cyber Hunt', '3', 2, 4, '', '', 0, true],
  ['07', 'Tech Wars', '3', 1, 2, '', '', 0, true],
  ['09', 'CEO Quest', '3', 1, 1, '', '', 0, true],
  ['10', 'Tech Treasure Hunt', '3', 3, 5, '', '', 0, true],
  ['11', 'TechSnap', 'TS', 2, 2, '', '', 0, true]
];

// ============================================================
// SMALL HELPERS
// ============================================================
function props_() { return PropertiesService.getScriptProperties(); }
function nowStr_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(extra) { return Object.assign({ success: true }, extra || {}); }
function fail_(code, message, extra) { return Object.assign({ success: false, error: code, message: message }, extra || {}); }
function err_(field, message, code) { return { field: field, message: message, code: code || 'INVALID' }; }

function isTrue_(v) { return v === true || String(v).trim().toUpperCase() === 'TRUE'; }
function normId_(v) { return String(v === null || v === undefined ? '' : v).trim().toUpperCase(); }
function cleanText_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  return String(v).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Spreadsheet formula injection guard.
function neutralize_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function normPhone_(raw) {
  let s = String(raw === null || raw === undefined ? '' : raw).replace(/\s+/g, '');
  if (s.indexOf('+91') === 0) s = s.slice(3);
  else if (s.charAt(0) === '0') s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}
function idLetters_(id) {
  const m = COLLEGE_ID_LETTERS_REGEX.exec(id);
  return m ? m[1] : '';
}
function splitList_(v) {
  return String(v === null || v === undefined ? '' : v).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}
function parseGameSizes_(v) {
  const out = {};
  splitList_(v).forEach(function (pair) {
    const i = pair.lastIndexOf(':');
    if (i < 1) return;
    const n = parseInt(pair.slice(i + 1), 10);
    if (n > 0) out[pair.slice(0, i).trim()] = n;
  });
  return out;
}
function secureEquals_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function hash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)).slice(0, 32);
}
function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function colIndex_(sheetName, header) { return HEADERS[sheetName].indexOf(header) + 1; }

// ============================================================
// SHEET ACCESS
// ============================================================
function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet missing: ' + name + '. Run setup().');
  return sh;
}

function readTable_(name) {
  const sh = sheet_(name);
  const hdr = HEADERS[name];
  const last = sh.getLastRow();
  if (last < 2) return { sheet: sh, rows: [] };
  const vals = sh.getRange(2, 1, last - 1, hdr.length).getValues();
  const rows = [];
  for (let i = 0; i < vals.length; i++) {
    const o = { _row: i + 2 };
    for (let j = 0; j < hdr.length; j++) o[hdr[j]] = vals[i][j];
    rows.push(o);
  }
  return { sheet: sh, rows: rows };
}

function ensureRows_(sh, name, neededRow) {
  const max = sh.getMaxRows();
  if (neededRow <= max) return;
  const add = Math.max(500, neededRow - max);
  sh.insertRowsAfter(max, add);
  formatTextColumns_(sh, name, max + 1, add);
}

function formatTextColumns_(sh, name, startRow, numRows) {
  (TEXT_COLUMNS[name] || []).forEach(function (h) {
    sh.getRange(startRow, colIndex_(name, h), numRows, 1).setNumberFormat('@');
  });
}

function appendRow_(name, obj, undo) {
  const sh = sheet_(name);
  const r = Math.max(sh.getLastRow(), 1) + 1;
  ensureRows_(sh, name, r);
  const vals = HEADERS[name].map(function (h) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''; });
  const rng = sh.getRange(r, 1, 1, vals.length);
  rng.setValues([vals]);
  if (undo) undo.push(function () { rng.clearContent(); });
  return r;
}

function setCell_(name, row, header, value, undo) {
  const rng = sheet_(name).getRange(row, colIndex_(name, header));
  const old = rng.getValue();
  rng.setValue(value);
  if (undo) undo.push(function () { rng.setValue(old); });
}

function rollback_(undo) {
  for (let i = undo.length - 1; i >= 0; i--) {
    try { undo[i](); } catch (e) { console.error('Rollback step failed: ' + e); }
  }
}

function log_(actor, action, regId, detail, undo) {
  appendRow_(S.LOG, {
    Timestamp: nowStr_(), Actor: neutralize_(String(actor)), Action: action,
    RegID: regId || '', Detail: neutralize_(String(detail || '').slice(0, 500))
  }, undo);
}

function nextId_(propKey, prefix) {
  const p = props_();
  const n = (parseInt(p.getProperty(propKey), 10) || 0) + 1;
  p.setProperty(propKey, String(n)); // never reused, even if the request later fails
  return prefix + String(n).padStart(4, '0');
}

// ============================================================
// EVENTS
// ============================================================
function readEvents_() {
  return readTable_(S.EVENTS).rows
    .filter(function (r) { return String(r.EventID).trim() !== '' && SLOTS.indexOf(String(r.Slot).trim().toUpperCase()) !== -1; })
    .map(function (r) {
      return {
        eventId: String(r.EventID).trim(),
        name: String(r.Name),
        slot: String(r.Slot).trim().toUpperCase(),
        teamMin: Number(r.TeamMin) || 1,
        teamMax: Number(r.TeamMax) || 1,
        games: splitList_(r.Games),
        gameSizes: parseGameSizes_(r.GameSizes),
        fee: Number(r.Fee) || 0,
        open: isTrue_(r.Open),
        totalReg: r.TotalReg
      };
    });
}

function getPublicEvents_() {
  return readEvents_().map(function (e) {
    return { eventId: e.eventId, name: e.name, slot: e.slot, teamMin: e.teamMin, teamMax: e.teamMax,
      games: e.games, gameSizes: e.gameSizes, fee: e.fee, open: e.open };
  });
}

// ============================================================
// WEB APP ENTRY POINTS
// ============================================================
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'get_events') {
      return jsonOut_(ok_({ events: getPublicEvents_() }));
    }
  } catch (err) {
    console.error(err);
    return jsonOut_(fail_('SERVER_ERROR', GENERIC_ERR));
  }
  return jsonOut_({ success: true, message: 'OK' });
}

function doPost(e) {
  let data;
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY_CHARS) return jsonOut_(fail_('PAYLOAD_TOO_LARGE', 'The upload is too large.'));
    data = JSON.parse(raw);
  } catch (err) {
    return jsonOut_(fail_('BAD_REQUEST', 'Invalid request.'));
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return jsonOut_(fail_('BAD_REQUEST', 'Invalid request.'));

  const action = String(data.action || '');
  try {
    if (action === 'get_events') return jsonOut_(ok_({ events: getPublicEvents_() }));

    if (action === 'register') {
      const pre = preCheckRegister_(data);
      if (pre) return jsonOut_(pre);
    }
    return jsonOut_(withLock_(function () { return route_(action, data); }));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonOut_(fail_('SERVER_ERROR', GENERIC_ERR));
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return fail_('BUSY', 'The system is busy. Please retry in a moment.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function route_(action, data) {
  if (action === 'register') return handleRegister_(data);
  if (action === 'admin_login') return adminLogin_(data);

  const ADMIN = {
    admin_get_data: adminGetData_,
    admin_get_screenshot: adminGetScreenshot_,
    admin_verify_payment: adminVerifyPayment_,
    admin_reject_payment: adminRejectPayment_,
    admin_cancel: adminCancel_,
    admin_swap_member: adminSwapMember_,
    admin_remove_member: adminRemoveMember_,
    admin_change_captain: adminChangeCaptain_,
    admin_edit_participant: adminEditParticipant_,
    admin_log_export: adminLogExport_
  };
  if (!Object.prototype.hasOwnProperty.call(ADMIN, action)) return fail_('INVALID_ACTION', 'Invalid action.');

  const session = getSession_(data.token);
  if (!session) return fail_('AUTH_REQUIRED', 'Session expired. Please log in again.');

  // Re-check the admin account on every request: disabling an admin takes effect immediately.
  const admin = findAdmin_(session.id);
  if (!admin || !admin.active) {
    CacheService.getScriptCache().remove('SESS_' + String(data.token));
    return fail_('AUTH_REQUIRED', 'Session expired. Please log in again.');
  }
  const actor = actorLabel_(admin);

  const undo = [];
  try {
    return ADMIN[action](data, actor, undo);
  } catch (err) {
    rollback_(undo);
    console.error(err && err.stack ? err.stack : err);
    return fail_('SERVER_ERROR', GENERIC_ERR);
  }
}

// ============================================================
// REGISTRATION: PRE-CHECKS (before the lock)
// ============================================================
function preCheckRegister_(data) {
  if (data.website) return fail_('BAD_REQUEST', 'Invalid request.'); // honeypot
  const key = String(data.idempotencyKey || '');
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) return fail_('BAD_REQUEST', 'Invalid request.');
  if (data.members !== undefined && (!Array.isArray(data.members) || data.members.length > MAX_TEAM_MEMBERS)) {
    return fail_('BAD_REQUEST', 'Invalid team members.');
  }

  const cache = CacheService.getScriptCache();
  const prev = cache.get('IDEM_' + key);
  if (prev) return JSON.parse(prev); // retry of an already-processed request

  const cap = data.captain && typeof data.captain === 'object' ? data.captain : {};
  const capId = normId_(cap.collegeId);
  const email = String(cap.email || '').trim().toLowerCase();
  const keys = [];
  if (capId) keys.push('THR_ID_' + hash_(capId));
  if (email) keys.push('THR_EM_' + hash_(email));
  const now = Date.now();
  const lists = keys.map(function (k) {
    let arr = [];
    try { arr = JSON.parse(cache.get(k) || '[]'); } catch (e) { arr = []; }
    return arr.filter(function (t) { return now - t < THROTTLE_WINDOW_MS; });
  });
  for (let i = 0; i < lists.length; i++) {
    if (lists[i].length >= THROTTLE_MAX) {
      return fail_('THROTTLED', 'Too many attempts. Please wait a few minutes and try again.');
    }
  }
  keys.forEach(function (k, i) {
    lists[i].push(now);
    cache.put(k, JSON.stringify(lists[i]), Math.ceil(THROTTLE_WINDOW_MS / 1000));
  });
  return null;
}

// ============================================================
// VALIDATION
// ============================================================
const PERSON_KEYS = ['fullName', 'collegeId', 'email', 'phone', 'year', 'branch'];
const TOP_KEYS = ['action', 'idempotencyKey', 'website', 'eventId', 'teamName', 'game', 'consent', 'captain', 'members', 'payment'];
// Server-owned values a client might send. Ignored, never trusted.
const TOLERATED_KEYS = ['amount', 'fee', 'slot', 'teamMin', 'teamMax', 'games', 'gameSizes'];

function validatePerson_(p, label, errors) {
  const start = errors.length;
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    errors.push(err_(label, label + ': details are missing.'));
    return null;
  }
  Object.keys(p).forEach(function (k) {
    if (PERSON_KEYS.indexOf(k) === -1) errors.push(err_(label, label + ': unexpected field.'));
  });

  const out = {};
  out.collegeId = normId_(p.collegeId);
  const idOk = COLLEGE_ID_REGEX.test(out.collegeId);
  const who = label + (idOk ? ' (' + out.collegeId + ')' : '');
  if (!idOk) errors.push(err_(label + '.collegeId', label + ': College ID is not valid.'));

  out.fullName = cleanText_(p.fullName);
  if (out.fullName.length < 2 || out.fullName.length > 80) errors.push(err_(label + '.fullName', who + ': full name must be 2 to 80 characters.'));

  out.email = cleanText_(p.email).toLowerCase();
  if (out.email.length > 254 || !EMAIL_REGEX.test(out.email)) errors.push(err_(label + '.email', who + ': email is not valid.'));

  out.phone = normPhone_(p.phone);
  if (!out.phone) errors.push(err_(label + '.phone', who + ': phone must be a 10-digit number starting with 6, 7, 8 or 9.'));

  out.year = cleanText_(p.year);
  out.branch = cleanText_(p.branch);
  const yearOk = YEARS.indexOf(out.year) !== -1;
  const branchOk = BRANCHES.indexOf(out.branch) !== -1;
  if (!yearOk) errors.push(err_(label + '.year', who + ': year is not valid.'));
  if (!branchOk) errors.push(err_(label + '.branch', who + ': branch is not valid.'));
  if (yearOk && branchOk) {
    if (out.branch === 'ASH' && out.year !== '1st') {
      errors.push(err_(label + '.branch', who + ': ASH is only for 1st year students.', 'BRANCH_YEAR'));
    }
    if (out.year === '1st' && ['ASH', 'MBA', 'MCA'].indexOf(out.branch) === -1) {
      errors.push(err_(label + '.branch', who + ': 1st year students must choose ASH (MBA and MCA students choose MBA or MCA).', 'BRANCH_YEAR'));
    }
    if ((out.branch === 'MBA' || out.branch === 'MCA') && out.year !== '1st' && out.year !== '2nd') {
      errors.push(err_(label + '.year', who + ': MBA and MCA students can only be 1st or 2nd year.', 'BRANCH_YEAR'));
    }
  }
  return errors.length === start ? out : null;
}

function failValidation_(errors) {
  return { success: false, error: 'VALIDATION_FAILED', message: errors.map(function (e) { return e.message; }).join(' '), errors: errors };
}

// ============================================================
// REGISTRATION (inside the lock)
// ============================================================
function handleRegister_(data) {
  const cache = CacheService.getScriptCache();
  const idemKey = String(data.idempotencyKey || '');
  const prev = cache.get('IDEM_' + idemKey);
  if (prev) return JSON.parse(prev);

  const errors = [];
  Object.keys(data).forEach(function (k) {
    if (TOP_KEYS.indexOf(k) === -1 && TOLERATED_KEYS.indexOf(k) === -1) errors.push(err_('payload', 'Unexpected field in request.'));
  });

  // 1. Event exists and is open
  const events = readEvents_();
  const eventId = cleanText_(data.eventId);
  const event = events.filter(function (e) { return e.eventId === eventId; })[0];
  if (!event) return fail_('EVENT_NOT_FOUND', 'This event does not exist.');
  if (!event.open) errors.push(err_('event', 'Registration for ' + event.name + ' is closed.', 'EVENT_CLOSED'));
  if (data.consent !== true) errors.push(err_('consent', 'The captain must confirm that all members agreed to share their details.'));

  // 2. People
  const rawMembers = data.members === undefined ? [] : data.members;
  const captain = validatePerson_(data.captain, 'Captain', errors);
  const members = [];
  rawMembers.forEach(function (m, i) {
    const p = validatePerson_(m, 'Member ' + (i + 2), errors);
    if (p) members.push(p);
  });
  const teamSize = 1 + rawMembers.length;

  // 3. Game + team size + team name
  let game = '';
  if (event.games.length) {
    const wanted = cleanText_(data.game).toLowerCase();
    const match = event.games.filter(function (g) { return g.toLowerCase() === wanted; })[0];
    if (!match) errors.push(err_('game', 'Choose exactly one game for ' + event.name + '.'));
    else game = match;
  }
  let min = event.teamMin, max = event.teamMax;
  if (game && event.gameSizes[game]) { min = max = event.gameSizes[game]; }
  if (teamSize < min || teamSize > max) {
    errors.push(err_('members', (min === max ? 'Team size must be exactly ' + min : 'Team size must be between ' + min + ' and ' + max) +
      (game ? ' for ' + game : '') + '.', 'TEAM_SIZE'));
  }

  let teamName = '';
  if (event.teamMax > 1) {
    teamName = cleanText_(data.teamName);
    if (teamSize >= 2 || teamName) {
      if (teamName.length < 2 || teamName.length > 40) errors.push(err_('teamName', 'Team name must be 2 to 40 characters.'));
    }
  }

  // 4. Duplicates inside the team
  const all = [];
  if (captain) all.push(captain);
  members.forEach(function (m) { all.push(m); });
  const seen = {};
  const dupIds = [];
  all.forEach(function (p) {
    if (seen[p.collegeId] && dupIds.indexOf(p.collegeId) === -1) dupIds.push(p.collegeId);
    seen[p.collegeId] = true;
  });
  if (dupIds.length) errors.push(err_('members', 'The same College ID is listed more than once: ' + dupIds.join(', ') + '. The captain is already counted as a member.', 'DUPLICATE_ID'));

  // Sheets used by the slot / team-name / UTR checks
  const regs = readTable_(S.REGS).rows;
  const parts = readTable_(S.PARTS).rows;
  const partMap = {};
  parts.forEach(function (r) { partMap[String(r.CollegeID)] = r; });
  const regStatus = {};
  regs.forEach(function (r) { regStatus[String(r.RegID)] = String(r.Status); });

  if (teamName && teamName.length >= 2) {
    const lower = teamName.toLowerCase();
    const taken = regs.some(function (r) {
      return String(r.EventID) === event.eventId && String(r.Status) !== 'cancelled' && String(r.TeamName).trim().toLowerCase() === lower;
    });
    if (taken) errors.push(err_('teamName', 'This team name is already used in ' + event.name + '. Please choose another.', 'TEAM_NAME_TAKEN'));
  }

  // 5. Slot conflicts (every member)
  const slotCol = SLOT_COLUMN[event.slot];
  const conflicts = [];
  all.forEach(function (p) {
    const row = partMap[p.collegeId];
    if (!row) return;
    const held = String(row[slotCol] || '').trim();
    if (held && regStatus[held] !== 'cancelled') conflicts.push(p.collegeId);
  });
  if (conflicts.length) {
    errors.push({
      field: 'members', code: 'SLOT_CONFLICT', slot: event.slot, conflictingIds: conflicts,
      message: 'Already registered in ' + SLOT_LABEL[event.slot] + ' (one event per slot): ' + conflicts.join(', ') + '.'
    });
  }

  // 6. Payment (paid events only)
  let utr = '', shotBytes = null, shotType = '';
  if (event.fee > 0) {
    const pay = data.payment;
    if (!pay || typeof pay !== 'object' || Array.isArray(pay)) {
      errors.push(err_('payment', 'Payment details are required.'));
    } else {
      utr = cleanText_(pay.utr);
      if (!/^\d{12}$/.test(utr)) errors.push(err_('payment.utr', 'UTR must be exactly 12 digits.'));
      const shot = pay.screenshot;
      if (!shot || typeof shot !== 'object') {
        errors.push(err_('payment.screenshot', 'Payment screenshot is required.'));
      } else {
        shotType = String(shot.type || '').toLowerCase();
        if (shotType === 'image/jpg') shotType = 'image/jpeg';
        if (shotType !== 'image/jpeg' && shotType !== 'image/png') {
          errors.push(err_('payment.screenshot', 'Screenshot must be a JPG or PNG image.'));
        } else {
          try {
            let b64 = String(shot.base64 || '');
            const comma = b64.indexOf(',');
            if (b64.indexOf('data:') === 0 && comma !== -1) b64 = b64.slice(comma + 1);
            shotBytes = Utilities.base64Decode(b64);
          } catch (e) { shotBytes = null; }
          if (!shotBytes || !shotBytes.length) {
            errors.push(err_('payment.screenshot', 'Screenshot could not be read.'));
          } else if (shotBytes.length > MAX_SCREENSHOT_BYTES) {
            errors.push(err_('payment.screenshot', 'Screenshot is too large.'));
          } else {
            const b = shotBytes.map(function (x) { return x & 0xFF; });
            const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
            const isJpg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
            if ((shotType === 'image/png' && !isPng) || (shotType === 'image/jpeg' && !isJpg)) {
              errors.push(err_('payment.screenshot', 'Screenshot must be a real JPG or PNG image.'));
            }
          }
        }
      }
      if (/^\d{12}$/.test(utr)) {
        const used = readTable_(S.PAYS).rows.some(function (r) {
          const st = String(r.Status);
          return String(r.UTR).trim() === utr && (st === 'pending' || st === 'verified');
        });
        if (used) errors.push(err_('payment.utr', 'This UTR has already been used.', 'UTR_USED'));
      }
    }
  }

  if (errors.length) return failValidation_(errors);

  // ---------- WRITES (all or nothing, best effort) ----------
  const undo = [];
  try {
    const regId = nextId_('REG_ID_COUNTER', 'TS-');
    const paid = event.fee > 0;
    const payId = paid ? nextId_('PAY_ID_COUNTER', 'PAY-') : '';
    const now = nowStr_();

    let shotUrl = '';
    if (paid) shotUrl = saveScreenshot_(shotBytes, shotType, regId, undo);

    all.forEach(function (p) { upsertParticipant_(p, slotCol, regId, partMap, undo); });

    const status = paid ? 'pending_verification' : 'confirmed';
    appendRow_(S.REGS, {
      RegID: regId, Timestamp: now, EventID: event.eventId, TeamName: neutralize_(teamName), Game: game,
      CaptainID: captain.collegeId, TeamSize: all.length, Status: status, UpdatedAt: now
    }, undo);
    all.forEach(function (p, i) {
      appendRow_(S.MEMBERS, { RegID: regId, CollegeID: p.collegeId, Role: i === 0 ? 'captain' : 'member', Active: true }, undo);
    });
    if (paid) {
      appendRow_(S.PAYS, {
        PaymentID: payId, RegID: regId, UTR: utr, Amount: event.fee, Status: 'pending',
        ScreenshotURL: shotUrl, SubmittedAt: now, VerifiedBy: '', VerifiedAt: '', Note: ''
      }, undo);
    }
    log_(captain.collegeId, 'REGISTER', regId, event.name + '; size=' + all.length + (game ? '; game=' + game : ''), undo);

    const result = ok_({
      regId: regId, status: status, eventId: event.eventId, eventName: event.name,
      teamName: teamName, game: game, teamSize: all.length, paymentStatus: paid ? 'pending_verification' : 'not_required'
    });
    cache.put('IDEM_' + idemKey, JSON.stringify(result), IDEM_TTL_SEC);
    return result;
  } catch (err) {
    rollback_(undo);
    console.error(err && err.stack ? err.stack : err);
    return fail_('SERVER_ERROR', GENERIC_ERR);
  }
}

function saveScreenshot_(bytes, mime, regId, undo) {
  const folderId = props_().getProperty('DRIVE_FOLDER_ID');
  if (!folderId) throw new Error('DRIVE_FOLDER_ID not set');
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(bytes, mime, regId + (mime === 'image/png' ? '.png' : '.jpg'));
  const file = folder.createFile(blob); // NEVER shared: no setSharing call anywhere
  undo.push(function () { file.setTrashed(true); });
  return file.getUrl();
}

function addFlag_(row, flag, undo) {
  const flags = splitList_(row.Flags);
  if (flags.indexOf(flag) !== -1) return;
  flags.push(flag);
  row.Flags = flags.join(', ');
  setCell_(S.PARTS, row._row, 'Flags', row.Flags, undo);
}

// Creates the participant or sets the slot cell. Never overwrites existing details.
function upsertParticipant_(p, slotCol, regId, partMap, undo) {
  const existing = partMap[p.collegeId];
  if (!existing) {
    const letters = idLetters_(p.collegeId);
    const flags = [];
    if (p.branch !== 'ASH' && letters && letters !== p.branch) flags.push('BRANCH_MISMATCH');
    const obj = {
      CollegeID: p.collegeId, FullName: neutralize_(p.fullName), Email: p.email, Phone: p.phone,
      Year: p.year, Branch: p.branch, Slot1: '', Slot2: '', Slot3: '', TechSnap: '',
      Flags: flags.join(', '), CreatedAt: nowStr_()
    };
    obj[slotCol] = regId;
    obj._row = appendRow_(S.PARTS, obj, undo);
    partMap[p.collegeId] = obj;
    return;
  }
  setCell_(S.PARTS, existing._row, slotCol, regId, undo);
  existing[slotCol] = regId;
  const differs = String(existing.FullName).trim().toLowerCase() !== p.fullName.toLowerCase() ||
    String(existing.Email).trim().toLowerCase() !== p.email ||
    String(existing.Phone).trim() !== p.phone;
  if (differs) addFlag_(existing, 'CONTACT_DIFFERS', undo);
}

// ============================================================
// ADMIN: ACCOUNTS (separate owner-only spreadsheet, tab "Admins")
// ============================================================
// Columns: AdminID | Name | Password | Active
function readAdmins_() {
  const id = props_().getProperty('ADMIN_SHEET_ID');
  if (!id) throw new Error('ADMIN_SHEET_ID not set');
  const sh = SpreadsheetApp.openById(id).getSheetByName(ADMINS_TAB);
  if (!sh) throw new Error('Tab "' + ADMINS_TAB + '" missing in the admin spreadsheet. Run setup().');
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 4).getValues()
    .map(function (r) {
      const adminId = String(r[0] === null || r[0] === undefined ? '' : r[0]).trim().toLowerCase();
      return {
        id: adminId,
        name: cleanText_(r[1]).slice(0, 60) || adminId,
        password: String(r[2] === null || r[2] === undefined ? '' : r[2]).trim(),
        active: isTrue_(r[3])
      };
    })
    .filter(function (a) { return a.id; });
}

function findAdmin_(adminId) {
  const id = String(adminId || '').trim().toLowerCase();
  if (!id) return null;
  return readAdmins_().filter(function (a) { return a.id === id; })[0] || null;
}

// What goes into Admin_Log.Actor and Payments.VerifiedBy, e.g. "Rahul Sharma (admin2)".
function actorLabel_(admin) { return admin.name + ' (' + admin.id + ')'; }

// ============================================================
// ADMIN: AUTH
// ============================================================
// Failed-attempt counters and lockouts live in the cache (15 min window), per Admin ID.
function adminLogin_(data) {
  const cache = CacheService.getScriptCache();
  const now = Date.now();
  const rawId = String(data.adminId === undefined || data.adminId === null ? '' : data.adminId).trim().toLowerCase();
  const pw = String(data.password === undefined || data.password === null ? '' : data.password).trim();
  const idOk = ADMIN_ID_REGEX.test(rawId);
  // Anything that is not a well-formed ID shares one counter.
  const key = hash_(idOk ? rawId : '_invalid_');

  const lockUntil = parseInt(cache.get('ALOCK_' + key) || '0', 10);
  if (now < lockUntil) {
    return fail_('LOCKED', 'Login for this Admin ID is locked. Try again in ' + Math.ceil((lockUntil - now) / 60000) + ' minute(s).');
  }

  const admin = idOk ? findAdmin_(rawId) : null;
  const stored = admin ? admin.password : '';
  const passOk = secureEquals_(pw, stored); // always compared, so timing does not reveal valid IDs
  const usable = !!admin && admin.active && stored.length >= MIN_ADMIN_PASSWORD_LEN;

  if (!(usable && passOk)) {
    const fails = (parseInt(cache.get('AFAIL_' + key) || '0', 10) || 0) + 1;
    if (fails >= LOGIN_MAX_FAILS) {
      cache.remove('AFAIL_' + key);
      cache.put('ALOCK_' + key, String(now + LOGIN_LOCK_MS), LOGIN_LOCK_SEC);
      log_('system', 'LOCKOUT', '', 'Login locked for 15 minutes after ' + LOGIN_MAX_FAILS + ' failures. Admin ID: ' + (idOk ? rawId : '(invalid format)'));
    } else {
      cache.put('AFAIL_' + key, String(fails), LOGIN_LOCK_SEC);
      if (admin) log_(actorLabel_(admin), 'LOGIN_FAILED', '', 'Attempt ' + fails + ' of ' + LOGIN_MAX_FAILS);
    }
    return fail_('AUTH_FAILED', 'Incorrect Admin ID or password.');
  }

  cache.remove('AFAIL_' + key);
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put('SESS_' + token, JSON.stringify({ id: admin.id }), SESSION_TTL_SEC);
  log_(actorLabel_(admin), 'LOGIN_OK', '', '');
  return ok_({ token: token, name: admin.name, adminId: admin.id, expiresInSeconds: SESSION_TTL_SEC });
}

function getSession_(token) {
  const t = String(token || '');
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  const v = CacheService.getScriptCache().get('SESS_' + t);
  if (!v) return null;
  const s = JSON.parse(v);
  return s && s.id ? s : null;
}

// ============================================================
// ADMIN: HELPERS
// ============================================================
function findReg_(regId) {
  return readTable_(S.REGS).rows.filter(function (r) { return String(r.RegID) === regId; })[0] || null;
}
function findPayment_(regId) {
  const list = readTable_(S.PAYS).rows.filter(function (r) { return String(r.RegID) === regId; });
  return list.length ? list[list.length - 1] : null;
}
function activeMembers_(regId) {
  return readTable_(S.MEMBERS).rows.filter(function (r) { return String(r.RegID) === regId && isTrue_(r.Active); });
}
function eventOf_(eventId) {
  return readEvents_().filter(function (e) { return e.eventId === String(eventId); })[0] || null;
}
function partMap_() {
  const m = {};
  readTable_(S.PARTS).rows.forEach(function (r) { m[String(r.CollegeID)] = r; });
  return m;
}
function clearSlot_(collegeId, slotCol, regId, pmap, undo) {
  const row = pmap[collegeId];
  if (row && String(row[slotCol]).trim() === regId) {
    setCell_(S.PARTS, row._row, slotCol, '', undo);
    row[slotCol] = '';
  }
}
function appendNote_(old, note) {
  old = String(old || '').trim();
  return old ? old + ' | ' + note : note;
}
function touchReg_(reg, undo) { setCell_(S.REGS, reg._row, 'UpdatedAt', nowStr_(), undo); }

// Marks registration cancelled, deactivates all members, frees every slot.
function releaseRegistration_(reg, event, undo) {
  const regId = String(reg.RegID);
  const slotCol = SLOT_COLUMN[event.slot];
  const pmap = partMap_();
  readTable_(S.MEMBERS).rows.forEach(function (m) {
    if (String(m.RegID) === regId && isTrue_(m.Active)) {
      setCell_(S.MEMBERS, m._row, 'Active', false, undo);
      clearSlot_(String(m.CollegeID), slotCol, regId, pmap, undo);
    }
  });
  setCell_(S.REGS, reg._row, 'Status', 'cancelled', undo);
  setCell_(S.REGS, reg._row, 'TeamSize', 0, undo);
  touchReg_(reg, undo);
}

// ============================================================
// ADMIN: READ
// ============================================================
function adminGetData_() {
  const events = readEvents_();
  const evMap = {};
  events.forEach(function (e) { evMap[e.eventId] = e; });
  const regs = readTable_(S.REGS).rows.filter(function (r) { return String(r.RegID); });
  const mems = readTable_(S.MEMBERS).rows;
  const pmap = partMap_();
  const pays = readTable_(S.PAYS).rows;

  const payByReg = {};
  pays.forEach(function (p) { payByReg[String(p.RegID)] = p; });
  const memByReg = {};
  mems.forEach(function (m) {
    const k = String(m.RegID);
    (memByReg[k] = memByReg[k] || []).push(m);
  });

  const unique = {};
  const perEvent = {};
  events.forEach(function (e) { perEvent[e.eventId] = { name: e.name, total: 0 }; });
  let cancelled = 0;

  const list = regs.map(function (r) {
    const regId = String(r.RegID);
    const ev = evMap[String(r.EventID)];
    const status = String(r.Status);
    const members = (memByReg[regId] || []).map(function (m) {
      const part = pmap[String(m.CollegeID)] || {};
      const active = isTrue_(m.Active);
      if (active && status !== 'cancelled') unique[String(m.CollegeID)] = true;
      return {
        collegeId: String(m.CollegeID), role: String(m.Role), active: active,
        fullName: String(part.FullName || ''), email: String(part.Email || ''), phone: String(part.Phone || ''),
        year: String(part.Year || ''), branch: String(part.Branch || ''), flags: String(part.Flags || '')
      };
    });
    const pay = payByReg[regId];
    if (status === 'cancelled') cancelled++;
    else if (perEvent[String(r.EventID)]) perEvent[String(r.EventID)].total++;
    return {
      regId: regId, timestamp: String(r.Timestamp), eventId: String(r.EventID), eventName: ev ? ev.name : String(r.EventID),
      teamName: String(r.TeamName || ''), game: String(r.Game || ''), captainId: String(r.CaptainID),
      teamSize: Number(r.TeamSize) || 0, status: status, updatedAt: String(r.UpdatedAt), members: members,
      payment: pay ? {
        paymentId: String(pay.PaymentID), utr: String(pay.UTR), amount: Number(pay.Amount) || 0, status: String(pay.Status),
        hasScreenshot: !!String(pay.ScreenshotURL), submittedAt: String(pay.SubmittedAt),
        verifiedBy: String(pay.VerifiedBy || ''), verifiedAt: String(pay.VerifiedAt || ''), note: String(pay.Note || '')
      } : null
    };
  });

  const payStats = { pending: 0, verified: 0, rejected: 0 };
  pays.forEach(function (p) { const s = String(p.Status); if (payStats[s] !== undefined) payStats[s]++; });

  return ok_({
    events: events.map(function (e) {
      return { eventId: e.eventId, name: e.name, slot: e.slot, teamMin: e.teamMin, teamMax: e.teamMax, games: e.games,
        gameSizes: e.gameSizes, fee: e.fee, open: e.open };
    }),
    registrations: list,
    stats: {
      totalRegistrations: list.length - cancelled,
      cancelledRegistrations: cancelled,
      uniqueParticipants: Object.keys(unique).length,
      perEvent: perEvent,
      payments: payStats
    }
  });
}

function adminGetScreenshot_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const pay = findPayment_(regId);
  if (!pay || !String(pay.ScreenshotURL)) return fail_('NOT_FOUND', 'No screenshot found.');
  const m = /[-\w]{25,}/.exec(String(pay.ScreenshotURL));
  if (!m) return fail_('NOT_FOUND', 'No screenshot found.');
  const blob = DriveApp.getFileById(m[0]).getBlob();
  log_(actor, 'VIEW_SCREENSHOT', regId, '', undo);
  return ok_({ mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) });
}

// The browser builds CSVs and copies emails itself, then calls this so the action is on record.
// data: { kind, eventId (optional, '' = all events), count }
function adminLogExport_(data, actor, undo) {
  const kind = cleanText_(data.kind);
  if (EXPORT_KINDS.indexOf(kind) === -1) return fail_('BAD_REQUEST', 'Invalid export type.');
  const eventId = cleanText_(data.eventId).slice(0, 10);
  const count = Math.max(0, parseInt(data.count, 10) || 0);
  log_(actor, 'EXPORT', '', kind + '; event=' + (eventId || 'all') + '; rows=' + count, undo);
  return ok_({});
}

// ============================================================
// ADMIN: PAYMENT + CANCEL
// ============================================================
function adminVerifyPayment_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const note = neutralize_(cleanText_(data.note).slice(0, 200));
  const reg = findReg_(regId);
  const pay = findPayment_(regId);
  if (!reg) return fail_('NOT_FOUND', 'Registration not found.');
  if (!pay) return fail_('NO_PAYMENT', 'This registration has no payment.');
  if (String(pay.Status) !== 'pending' || String(reg.Status) === 'cancelled') {
    return fail_('BAD_STATE', 'Only a pending payment on an active registration can be verified.');
  }
  const now = nowStr_();
  setCell_(S.PAYS, pay._row, 'Status', 'verified', undo);
  setCell_(S.PAYS, pay._row, 'VerifiedBy', actor, undo);
  setCell_(S.PAYS, pay._row, 'VerifiedAt', now, undo);
  if (note) setCell_(S.PAYS, pay._row, 'Note', appendNote_(pay.Note, note), undo);
  setCell_(S.REGS, reg._row, 'Status', 'confirmed', undo);
  touchReg_(reg, undo);
  log_(actor, 'VERIFY_PAYMENT', regId, note, undo);
  return ok_({ message: 'Payment verified.' });
}

function adminRejectPayment_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const note = neutralize_(cleanText_(data.note).slice(0, 200));
  const reg = findReg_(regId);
  const pay = findPayment_(regId);
  if (!reg) return fail_('NOT_FOUND', 'Registration not found.');
  if (!pay) return fail_('NO_PAYMENT', 'This registration has no payment.');
  if (String(pay.Status) !== 'pending' || String(reg.Status) === 'cancelled') {
    return fail_('BAD_STATE', 'Only a pending payment on an active registration can be rejected.');
  }
  const event = eventOf_(reg.EventID);
  if (!event) return fail_('EVENT_NOT_FOUND', 'Event missing from the Events sheet.');
  setCell_(S.PAYS, pay._row, 'Status', 'rejected', undo);
  setCell_(S.PAYS, pay._row, 'VerifiedBy', actor, undo);
  setCell_(S.PAYS, pay._row, 'VerifiedAt', nowStr_(), undo);
  if (note) setCell_(S.PAYS, pay._row, 'Note', appendNote_(pay.Note, note), undo);
  releaseRegistration_(reg, event, undo);
  log_(actor, 'REJECT_PAYMENT', regId, note, undo);
  return ok_({ message: 'Payment rejected. Registration cancelled and slots freed.' });
}

function adminCancel_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const note = neutralize_(cleanText_(data.note).slice(0, 200));
  const reg = findReg_(regId);
  if (!reg) return fail_('NOT_FOUND', 'Registration not found.');
  if (String(reg.Status) === 'cancelled') return fail_('BAD_STATE', 'Registration is already cancelled.');
  const event = eventOf_(reg.EventID);
  if (!event) return fail_('EVENT_NOT_FOUND', 'Event missing from the Events sheet.');

  releaseRegistration_(reg, event, undo);
  const pay = findPayment_(regId);
  if (pay) {
    if (String(pay.Status) === 'pending') {
      // Never verified, so the UTR must not stay blocked forever.
      setCell_(S.PAYS, pay._row, 'Status', 'rejected', undo);
      setCell_(S.PAYS, pay._row, 'VerifiedBy', actor, undo);
      setCell_(S.PAYS, pay._row, 'VerifiedAt', nowStr_(), undo);
      setCell_(S.PAYS, pay._row, 'Note', appendNote_(pay.Note, 'Registration cancelled before verification'), undo);
    } else if (String(pay.Status) === 'verified') {
      setCell_(S.PAYS, pay._row, 'Note', appendNote_(pay.Note, 'Registration cancelled by ' + actor + '; refund handled outside the system'), undo);
    }
  }
  log_(actor, 'CANCEL', regId, note, undo);
  return ok_({ message: 'Registration cancelled. All member slots freed.' });
}

// ============================================================
// ADMIN: TEAM CHANGES
// ============================================================
function setCaptain_(reg, memberRows, newCaptainId, undo) {
  memberRows.forEach(function (m) {
    const want = String(m.CollegeID) === newCaptainId ? 'captain' : 'member';
    if (String(m.Role) !== want) setCell_(S.MEMBERS, m._row, 'Role', want, undo);
  });
  setCell_(S.REGS, reg._row, 'CaptainID', newCaptainId, undo);
}

function adminSwapMember_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const oldId = normId_(data.oldCollegeId);
  const reg = findReg_(regId);
  if (!reg || String(reg.Status) === 'cancelled') return fail_('NOT_FOUND', 'Active registration not found.');
  const event = eventOf_(reg.EventID);
  if (!event) return fail_('EVENT_NOT_FOUND', 'Event missing from the Events sheet.');

  const active = activeMembers_(regId);
  const oldRow = active.filter(function (m) { return String(m.CollegeID) === oldId; })[0];
  if (!oldRow) return fail_('NOT_FOUND', 'That member is not on this team.');

  const errors = [];
  const nm = validatePerson_(data.newMember, 'New member', errors);
  if (!nm) return failValidation_(errors);
  if (active.some(function (m) { return String(m.CollegeID) === nm.collegeId; })) {
    return fail_('DUPLICATE_ID', 'That student is already on this team.');
  }

  const slotCol = SLOT_COLUMN[event.slot];
  const pmap = partMap_();
  const existing = pmap[nm.collegeId];
  if (existing) {
    const held = String(existing[slotCol] || '').trim();
    if (held) {
      const other = findReg_(held);
      if (!other || String(other.Status) !== 'cancelled') {
        return fail_('SLOT_CONFLICT', 'Already registered in ' + SLOT_LABEL[event.slot] + ': ' + nm.collegeId + '.',
          { slot: event.slot, conflictingIds: [nm.collegeId] });
      }
    }
  }

  const wasCaptain = String(oldRow.Role) === 'captain';
  setCell_(S.MEMBERS, oldRow._row, 'Active', false, undo);
  clearSlot_(oldId, slotCol, regId, pmap, undo);
  upsertParticipant_(nm, slotCol, regId, pmap, undo);
  appendRow_(S.MEMBERS, { RegID: regId, CollegeID: nm.collegeId, Role: 'member', Active: true }, undo);

  if (wasCaptain) {
    let newCap = normId_(data.newCaptainId) || nm.collegeId;
    const remaining = activeMembers_(regId); // includes the new member row
    if (!remaining.some(function (m) { return String(m.CollegeID) === newCap; })) newCap = nm.collegeId;
    setCaptain_(reg, remaining, newCap, undo);
    log_(actor, 'CHANGE_CAPTAIN', regId, oldId + ' -> ' + newCap, undo);
  }
  setCell_(S.REGS, reg._row, 'TeamSize', activeMembers_(regId).length, undo);
  touchReg_(reg, undo);
  log_(actor, 'SWAP_MEMBER', regId, oldId + ' -> ' + nm.collegeId, undo);
  return ok_({ message: 'Member swapped.' });
}

function adminRemoveMember_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const targetId = normId_(data.collegeId);
  const reg = findReg_(regId);
  if (!reg || String(reg.Status) === 'cancelled') return fail_('NOT_FOUND', 'Active registration not found.');
  const event = eventOf_(reg.EventID);
  if (!event) return fail_('EVENT_NOT_FOUND', 'Event missing from the Events sheet.');

  const active = activeMembers_(regId);
  const target = active.filter(function (m) { return String(m.CollegeID) === targetId; })[0];
  if (!target) return fail_('NOT_FOUND', 'That member is not on this team.');
  if (active.length - 1 < event.teamMin) {
    return fail_('TEAM_MIN', 'Removing this member would take the team below the minimum size of ' + event.teamMin + '.');
  }
  const rest = active.filter(function (m) { return String(m.CollegeID) !== targetId; });
  let newCap = null;
  if (String(target.Role) === 'captain') {
    newCap = normId_(data.newCaptainId);
    if (!rest.some(function (m) { return String(m.CollegeID) === newCap; })) {
      return fail_('CAPTAIN_REQUIRED', 'Choose a new captain from the remaining members.');
    }
  }

  const pmap = partMap_();
  setCell_(S.MEMBERS, target._row, 'Active', false, undo);
  clearSlot_(targetId, SLOT_COLUMN[event.slot], regId, pmap, undo);
  if (newCap) {
    setCaptain_(reg, rest, newCap, undo);
    log_(actor, 'CHANGE_CAPTAIN', regId, targetId + ' -> ' + newCap, undo);
  }
  setCell_(S.REGS, reg._row, 'TeamSize', rest.length, undo);
  touchReg_(reg, undo);
  log_(actor, 'REMOVE_MEMBER', regId, targetId, undo);
  return ok_({ message: 'Member removed.' });
}

function adminChangeCaptain_(data, actor, undo) {
  const regId = cleanText_(data.regId);
  const newCap = normId_(data.collegeId);
  const reg = findReg_(regId);
  if (!reg || String(reg.Status) === 'cancelled') return fail_('NOT_FOUND', 'Active registration not found.');
  const active = activeMembers_(regId);
  if (!active.some(function (m) { return String(m.CollegeID) === newCap; })) {
    return fail_('NOT_FOUND', 'That member is not on this team.');
  }
  if (String(reg.CaptainID) === newCap) return fail_('BAD_STATE', 'That member is already the captain.');
  const oldCap = String(reg.CaptainID);
  setCaptain_(reg, active, newCap, undo);
  touchReg_(reg, undo);
  log_(actor, 'CHANGE_CAPTAIN', regId, oldCap + ' -> ' + newCap, undo);
  return ok_({ message: 'Captain changed.' });
}

function adminEditParticipant_(data, actor, undo) {
  const id = normId_(data.collegeId);
  const row = partMap_()[id];
  if (!row) return fail_('NOT_FOUND', 'Participant not found.');
  const f = data.fields && typeof data.fields === 'object' ? data.fields : {};
  const merged = {
    collegeId: id,
    fullName: f.fullName !== undefined ? f.fullName : row.FullName,
    email: f.email !== undefined ? f.email : row.Email,
    phone: f.phone !== undefined ? f.phone : row.Phone,
    year: f.year !== undefined ? f.year : row.Year,
    branch: f.branch !== undefined ? f.branch : row.Branch
  };
  const errors = [];
  const v = validatePerson_(merged, 'Participant', errors);
  if (!v) return failValidation_(errors);

  const changes = [];
  [['FullName', neutralize_(v.fullName)], ['Email', v.email], ['Phone', v.phone], ['Year', v.year], ['Branch', v.branch]].forEach(function (pair) {
    if (String(row[pair[0]]) !== String(pair[1])) {
      changes.push(pair[0] + ': ' + row[pair[0]] + ' -> ' + pair[1]);
      setCell_(S.PARTS, row._row, pair[0], pair[1], undo);
    }
  });
  if (!changes.length) return ok_({ message: 'No changes.' });
  log_(actor, 'EDIT_PARTICIPANT', '', id + ' | ' + changes.join('; '), undo);
  return ok_({ message: 'Participant updated.' });
}

// ============================================================
// MANUAL MAINTENANCE (run from the Apps Script editor)
// ============================================================
// Rebuilds Slot1/Slot2/Slot3/TechSnap in Participants from Registrations + Team_Members.
function rebuildSlotLedger() {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    const events = readEvents_();
    const evMap = {};
    events.forEach(function (e) { evMap[e.eventId] = e; });
    const regs = readTable_(S.REGS).rows;
    const regMap = {};
    regs.forEach(function (r) { regMap[String(r.RegID)] = r; });
    const members = readTable_(S.MEMBERS).rows;
    const parts = readTable_(S.PARTS);
    const idx = {};
    parts.rows.forEach(function (r) { idx[String(r.CollegeID)] = r._row; });

    const first = colIndex_(S.PARTS, 'Slot1');
    const lastRow = parts.sheet.getLastRow();
    if (lastRow >= 2) parts.sheet.getRange(2, first, lastRow - 1, 4).clearContent();

    const grid = {};
    const problems = [];
    members.forEach(function (m) {
      if (!isTrue_(m.Active)) return;
      const reg = regMap[String(m.RegID)];
      if (!reg || String(reg.Status) === 'cancelled') return;
      const ev = evMap[String(reg.EventID)];
      const row = idx[String(m.CollegeID)];
      if (!ev || !row) { problems.push('Skipped ' + m.CollegeID + ' in ' + m.RegID); return; }
      const col = SLOT_COLUMN[ev.slot];
      const key = row + '|' + col;
      if (grid[key]) { problems.push('CONFLICT ' + m.CollegeID + ' holds ' + grid[key] + ' and ' + m.RegID + ' in ' + col); return; }
      grid[key] = String(m.RegID);
      parts.sheet.getRange(row, colIndex_(S.PARTS, col)).setValue(String(m.RegID));
    });
    Logger.log('Slot ledger rebuilt. Problems: ' + (problems.length ? '\n' + problems.join('\n') : 'none'));
  } finally {
    lock.releaseLock();
  }
}

function dailyBackup() {
  const p = props_();
  let folderId = p.getProperty('BACKUP_FOLDER_ID');
  let folder;
  try { folder = folderId ? DriveApp.getFolderById(folderId) : null; } catch (e) { folder = null; }
  if (!folder) {
    folder = DriveApp.createFolder('TechSpardha_Backups');
    p.setProperty('BACKUP_FOLDER_ID', folder.getId());
  }
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  ssFile.makeCopy('TechSpardha_Backup_' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd_HHmm'), folder);

  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().indexOf('TechSpardha_Backup_') === 0) files.push(f);
  }
  files.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  files.slice(BACKUPS_TO_KEEP).forEach(function (f) { f.setTrashed(true); });
}

// ============================================================
// ONE-TIME SETUP (idempotent: never deletes data, never resets counters, never overwrites admins)
// ============================================================
function setup() {
  const p = props_();
  const missing = ['ADMIN_SHEET_ID', 'DRIVE_FOLDER_ID'].filter(function (k) { return !p.getProperty(k); });
  if (missing.length) throw new Error('Set these Script Properties first, then run setup() again: ' + missing.join(', '));
  DriveApp.getFolderById(p.getProperty('DRIVE_FOLDER_ID')); // fails loudly if the ID is wrong

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (p.getProperty('ADMIN_SHEET_ID') === ss.getId()) {
    throw new Error('ADMIN_SHEET_ID must be a SEPARATE owner-only spreadsheet, not the main TechSpardha spreadsheet.');
  }
  ensureAdminsTab_();

  ['REG_ID_COUNTER', 'PAY_ID_COUNTER'].forEach(function (k) {
    if (p.getProperty(k) === null) p.setProperty(k, '0');
  });

  ss.setSpreadsheetTimeZone(TZ);

  [S.EVENTS, S.REGS, S.MEMBERS, S.PARTS, S.PAYS, S.LOG].forEach(function (name) {
    ensureSheet_(ss, name);
  });

  // Seed events only when the tab has no event rows yet.
  const evSheet = ss.getSheetByName(S.EVENTS);
  if (evSheet.getLastRow() < 2) {
    evSheet.getRange(2, 1, EVENT_SEED.length, 9).setValues(EVENT_SEED);
  }

  // Dropdown validation
  listValidation_(ss, S.EVENTS, 'Slot', SLOTS);
  listValidation_(ss, S.EVENTS, 'Open', ['TRUE', 'FALSE'], true);
  listValidation_(ss, S.REGS, 'Status', ['pending_verification', 'confirmed', 'cancelled']);
  listValidation_(ss, S.MEMBERS, 'Role', ['captain', 'member']);
  listValidation_(ss, S.MEMBERS, 'Active', ['TRUE', 'FALSE'], true);
  listValidation_(ss, S.PARTS, 'Year', YEARS);
  listValidation_(ss, S.PARTS, 'Branch', BRANCHES);
  listValidation_(ss, S.PAYS, 'Status', ['pending', 'verified', 'rejected']);

  setupTotalRegFormulas_(ss);
  setupContacts_(ss);

  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyBackup'; })) {
    ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(3).inTimezone(TZ).create();
  }
  Logger.log('Setup complete. Add admin rows in the owner-only spreadsheet (tab "Admins"). Remember: set "timeZone": "Asia/Kolkata" in appsscript.json, then redeploy.');
}

// Creates the Admins tab in the owner-only spreadsheet if it is missing. Never touches existing rows.
function ensureAdminsTab_() {
  const adminSs = SpreadsheetApp.openById(props_().getProperty('ADMIN_SHEET_ID'));
  let sh = adminSs.getSheetByName(ADMINS_TAB);
  if (!sh) sh = adminSs.insertSheet(ADMINS_TAB);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, ADMIN_HEADERS.length).setValues([ADMIN_HEADERS]);
  }
  sh.getRange(1, 1, 1, ADMIN_HEADERS.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, 1, rows, 3).setNumberFormat('@'); // keep IDs and passwords as plain text
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).setAllowInvalid(true).build();
  sh.getRange(2, 4, rows, 1).setDataValidation(rule);
}

function ensureSheet_(ss, name) {
  const headers = HEADERS[name];
  let sh = ss.getSheetByName(name);
  if (sh) {
    const lastCol = sh.getLastColumn();
    const cur = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
    const same = cur.length === headers.length && headers.every(function (h, i) { return cur[i] === h; });
    if (!same) {
      if (sh.getLastRow() > 1) {
        // Old structure with data: keep it, rename, build a fresh tab.
        sh.setName(name + '_OLD_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmmss'));
        sh = null;
      } else {
        sh.clear();
      }
    }
  }
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (sh.getMaxRows() < MIN_SHEET_ROWS) sh.insertRowsAfter(sh.getMaxRows(), MIN_SHEET_ROWS - sh.getMaxRows());
  formatTextColumns_(sh, name, 2, sh.getMaxRows() - 1);
  return sh;
}

function listValidation_(ss, sheetName, header, values, allowInvalid) {
  const sh = ss.getSheetByName(sheetName);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(!!allowInvalid).build();
  sh.getRange(2, colIndex_(sheetName, header), sh.getMaxRows() - 1, 1).setDataValidation(rule);
}

function setupTotalRegFormulas_(ss) {
  const sh = ss.getSheetByName(S.EVENTS);
  const R = HEADERS.Registrations;
  const regId = colLetter_(R.indexOf('RegID') + 1);
  const evId = colLetter_(R.indexOf('EventID') + 1);
  const st = colLetter_(R.indexOf('Status') + 1);
  const rows = 60;
  const f = [];
  for (let r = 2; r < 2 + rows; r++) {
    f.push(['=IF($A' + r + '="","",SUMPRODUCT((Registrations!$' + evId + '$2:$' + evId + '$' + MIN_SHEET_ROWS + '=$A' + r + ')*(Registrations!$' + regId + '$2:$' + regId + '$' + MIN_SHEET_ROWS + '<>"")*(Registrations!$' + st + '$2:$' + st + '$' + MIN_SHEET_ROWS + '<>"cancelled")))']);
  }
  const col = colIndex_(S.EVENTS, 'TotalReg');
  sh.getRange(2, col, rows, 1).setNumberFormat('General').setFormulas(f);
  protectRange_(sh.getRange(2, col, rows, 1), 'TotalReg formulas. Do not edit.');
}

function setupContacts_(ss) {
  let sh = ss.getSheetByName(S.CONTACTS);
  if (!sh) sh = ss.insertSheet(S.CONTACTS);
  sh.clear();
  const N = MIN_SHEET_ROWS;
  sh.getRange(1, 1, 1, 8).setValues([['RegID', 'Event', 'Team', 'Role', 'Name', 'CollegeID', 'Email', 'Phone']]).setFontWeight('bold');
  sh.getRange(1, 11, 1, 3).setValues([['helper_RegID', 'helper_Role', 'helper_CollegeID']]);
  sh.setFrozenRows(1);

  const TM = 'Team_Members!';
  const RG = 'Registrations!';
  sh.getRange('K2').setFormula(
    '=IFERROR(FILTER({' + TM + '$A$2:$A$' + N + ',' + TM + '$C$2:$C$' + N + ',' + TM + '$B$2:$B$' + N + '},' +
    TM + '$D$2:$D$' + N + '=TRUE,' + TM + '$A$2:$A$' + N + '<>"",' +
    'ISNUMBER(MATCH(' + TM + '$A$2:$A$' + N + ',FILTER(' + RG + '$A$2:$A$' + N + ',' + RG + '$A$2:$A$' + N + '<>"",' + RG + '$H$2:$H$' + N + '<>"cancelled"),0))),"")');

  const K = '$K$2:$K$' + N, L = '$L$2:$L$' + N, M = '$M$2:$M$' + N;
  const lookup = function (key, range, idx) {
    return '=ARRAYFORMULA(IF(' + K + '="","",IFERROR(VLOOKUP(' + key + ',' + range + ',' + idx + ',FALSE),"")))';
  };
  sh.getRange('A2').setFormula('=ARRAYFORMULA(IF(' + K + '="","",' + K + '))');
  sh.getRange('B2').setFormula('=ARRAYFORMULA(IF(' + K + '="","",IFERROR(VLOOKUP(VLOOKUP(' + K + ',' + RG + '$A$2:$C$' + N + ',3,FALSE),Events!$A$2:$B$' + N + ',2,FALSE),"")))');
  sh.getRange('C2').setFormula(lookup(K, RG + '$A$2:$D$' + N, 4));
  sh.getRange('D2').setFormula('=ARRAYFORMULA(IF(' + K + '="","",' + L + '))');
  sh.getRange('E2').setFormula(lookup(M, 'Participants!$A$2:$D$' + N, 2));
  sh.getRange('F2').setFormula('=ARRAYFORMULA(IF(' + K + '="","",' + M + '))');
  sh.getRange('G2').setFormula(lookup(M, 'Participants!$A$2:$D$' + N, 3));
  sh.getRange('H2').setFormula(lookup(M, 'Participants!$A$2:$D$' + N, 4));
  sh.hideColumns(11, 3);
  protectSheet_(sh);
}

function protectSheet_(sh) {
  const existing = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  const prot = existing.length ? existing[0] : sh.protect();
  prot.setDescription('Formula tab. The script and humans do not write here.');
  const me = Session.getEffectiveUser();
  prot.addEditor(me);
  prot.removeEditors(prot.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (prot.canDomainEdit()) prot.setDomainEdit(false);
}

function protectRange_(range, description) {
  const sh = range.getSheet();
  const existing = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).filter(function (x) { return x.getDescription() === description; });
  const prot = existing.length ? existing[0] : range.protect();
  prot.setDescription(description);
  const me = Session.getEffectiveUser();
  prot.addEditor(me);
  prot.removeEditors(prot.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (prot.canDomainEdit()) prot.setDomainEdit(false);
}