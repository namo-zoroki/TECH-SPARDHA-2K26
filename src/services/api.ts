/**
 * TechSpardha 2K26 - API service (talks to the Google Apps Script backend, v1.4).
 *
 * Public:  getEvents(), checkTeamName(), register()
 * Admin:   apiService.admin.* (needs a session token from admin.login())
 *
 * Notes
 * - No Content-Type header is set on POST, so the browser sends text/plain and
 *   skips the CORS preflight that Apps Script cannot answer.
 * - Every call resolves to a result object; nothing throws. An unreadable or
 *   missing response is ALWAYS reported as a failure, never as success.
 */

const GAS_API_URL: string = (import.meta.env.VITE_GAS_API_URL as string | undefined) || '';

/** Show the "taking longer than usual" hint after this long (spec 6.10). */
export const SLOW_NOTICE_MS = 45_000;

const REGISTER_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const TEAM_NAME_CHECK_TIMEOUT_MS = 15_000;

const TOKEN_KEY = 'ts26_admin_token';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Event data as served by the backend (the Events sheet is the source of truth). */
export interface EventInfo {
  eventId: string;
  name: string;
  slot: '1' | '2' | '3' | 'TS';
  teamMin: number;
  teamMax: number;

  /** Allowed games (Gamer Fiesta only); empty for every other event. */
  games: string[];

  /** Exact team size per game, e.g. { Valorant: 5, BGMI: 4 }. Empty when not used. */
  gameSizes: Record<string, number>;

  /** Fee per team in INR. 0 = free (no payment step). */
  fee: number;

  open: boolean;
}

export interface Person {
  fullName: string;
  collegeId: string;
  email: string;
  phone: string;
  year: string;
  branch: string;
}

export interface RegisterPayload {
  /** Generate once per submit attempt; reuse it on retry. 8-100 chars of A-Z a-z 0-9 _ - */
  idempotencyKey: string;

  eventId: string;

  captain: Person;

  /** The OTHER members only. The captain is never repeated here. */
  members?: Person[];

  /**
   * Required when the team has 2+ members; optional for a single member.
   * Must start with A-Z, 2-40 chars, unique across the whole fest.
   */
  teamName?: string;

  /** Gamer Fiesta only: exactly one of the event's games. */
  game?: string;

  consent: boolean;

  /** Paid events only. */
  payment?: {
    utr: string;
    screenshot: {
      type: string;
      base64: string;
    };
  };

  /** Honeypot. Must stay empty. */
  website?: string;
}

/** Answer of the live team-name check. It is only a hint: register() checks again. */
export interface TeamNameCheck {
  available: boolean;

  /** false when the name was empty and nothing was checked. */
  checked?: boolean;

  /** Set when available is false. */
  reason?: 'FORMAT' | 'TEAM_NAME_TAKEN';

  /** Safe to show to the user. Empty when available. */
  message: string;
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
  slot?: string;
  conflictingIds?: string[];
}

export interface Failure {
  success: false;

  /** Machine code, e.g. VALIDATION_FAILED, THROTTLED, BUSY, NETWORK_ERROR, TIMEOUT. */
  error: string;

  /** Safe to show to the user. */
  message: string;

  errors?: FieldError[];
  slot?: string;
  conflictingIds?: string[];
}

export type ApiResult<T> = ({ success: true } & T) | Failure;

export interface RegisterSuccess {
  regId: string;
  status: 'confirmed' | 'pending_verification';
  eventId: string;
  eventName: string;
  teamName: string;
  game: string;
  teamSize: number;
  paymentStatus: 'not_required' | 'pending_verification';
}

export type RegStatus = 'pending_verification' | 'confirmed' | 'cancelled';

export type PayStatus = 'pending' | 'verified' | 'rejected';

export type ExportKind = 'registrations_csv' | 'contacts_csv' | 'copy_all_emails' | 'copy_captain_emails';

export interface AdminMember {
  collegeId: string;
  role: 'captain' | 'member';
  active: boolean;
  fullName: string;
  email: string;
  phone: string;
  year: string;
  branch: string;
  flags: string;
}

export interface AdminPayment {
  paymentId: string;
  utr: string;
  amount: number;
  status: PayStatus;
  hasScreenshot: boolean;
  submittedAt: string;
  verifiedBy: string;
  verifiedAt: string;
  note: string;
}

export interface AdminRegistration {
  regId: string;
  timestamp: string;
  eventId: string;
  eventName: string;
  teamName: string;
  game: string;
  captainId: string;
  teamSize: number;
  status: RegStatus;
  updatedAt: string;
  members: AdminMember[];
  payment: AdminPayment | null;
}

export interface AdminStats {
  totalRegistrations: number;
  cancelledRegistrations: number;
  uniqueParticipants: number;

  perEvent: Record<string, { name: string; total: number }>;

  payments: {
    pending: number;
    verified: number;
    rejected: number;
  };
}

export interface AdminData {
  events: EventInfo[];
  registrations: AdminRegistration[];
  stats: AdminStats;
}

export interface AdminLoginResult {
  token: string;
  name: string;
  adminId: string;
  expiresInSeconds: number;
}

export type MessageResult = {
  message: string;
};

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

interface RequestOptions {
  timeoutMs?: number;

  /** Called once if the request is still running after SLOW_NOTICE_MS. */
  onSlow?: () => void;
}

function failure(error: string, message: string): Failure {
  return { success: false, error, message };
}

async function post<T>(body: Record<string, unknown>, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  if (!GAS_API_URL) {
    return failure('CONFIG_ERROR', 'The registration service is not configured. Please contact the organizers.');
  }

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const killTimer = setTimeout(() => controller.abort(), timeoutMs);
  const slowTimer = opts.onSlow ? setTimeout(opts.onSlow, SLOW_NOTICE_MS) : undefined;

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await readResponse<T>(response);
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return failure(
        'TIMEOUT',
        'The server is taking too long to respond. Do not re-enter your details. Press Retry.',
      );
    }
    console.error('API request failed:', err);
    return failure('NETWORK_ERROR', 'Could not reach the server. Check your internet connection and press Retry.');
  } finally {
    clearTimeout(killTimer);
    if (slowTimer) clearTimeout(slowTimer);
  }
}

async function readResponse<T>(response: Response): Promise<ApiResult<T>> {
  if (!response.ok) {
    console.error('Server returned HTTP', response.status);
    return failure('SERVER_ERROR', 'The server could not process the request. Please try again.');
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure(
      'BAD_RESPONSE',
      'Received an unreadable response from the server. Nothing is confirmed. Please retry.',
    );
  }

  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { success?: unknown }).success !== 'boolean') {
    return failure(
      'BAD_RESPONSE',
      'Received an unreadable response from the server. Nothing is confirmed. Please retry.',
    );
  }

  return parsed as ApiResult<T>;
}

// ---------------------------------------------------------------------------
// Admin session token
// ---------------------------------------------------------------------------

let memoryToken: string | null = null;

function getToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: memory only */
  }
  return memoryToken;
}

function setToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function adminCall<T>(
  action: string,
  params: Record<string, unknown> = {},
  timeoutMs?: number,
): Promise<ApiResult<T>> {
  const token = getToken();
  if (!token) return failure('AUTH_REQUIRED', 'Please log in again.');

  const result = await post<T>({ action, token, ...params }, { timeoutMs });

  if (!result.success && result.error === 'AUTH_REQUIRED') setToken(null);
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const apiService = {
  /** Loads operational event data. */
  async getEvents(): Promise<ApiResult<{ events: EventInfo[] }>> {
    return post<{ events: EventInfo[] }>({ action: 'get_events' });
  },

  /**
   * Live "is this team name free?" check (read-only, a hint for the form).
   * Pass the captain's College ID when it is valid: the same captain may reuse their own team name.
   * May fail with THROTTLED (site-wide limit); treat any failure as "unknown" and carry on.
   */
  async checkTeamName(teamName: string, captainId?: string): Promise<ApiResult<TeamNameCheck>> {
    return post<TeamNameCheck>(
      { action: 'check_team_name', teamName, captainId: captainId ?? '' },
      { timeoutMs: TEAM_NAME_CHECK_TIMEOUT_MS },
    );
  },

  /**
   * Submits one registration.
   *
   * Reuse the same idempotencyKey when retrying after a timeout
   * or network failure so the server never creates a duplicate.
   */
  async register(payload: RegisterPayload, opts: { onSlow?: () => void } = {}): Promise<ApiResult<RegisterSuccess>> {
    return post<RegisterSuccess>(
      {
        action: 'register',
        ...payload,
        website: payload.website ?? '',
      },
      {
        timeoutMs: REGISTER_TIMEOUT_MS,
        onSlow: opts.onSlow,
      },
    );
  },

  admin: {
    hasSession(): boolean {
      return !!getToken();
    },

    /**
     * Admin login.
     *
     * IMPORTANT: the backend expects `adminId`, NOT `name`.
     * Result: { token, name, adminId, expiresInSeconds }.
     */
    async login(adminId: string, password: string): Promise<ApiResult<AdminLoginResult>> {
      const result = await post<AdminLoginResult>({
        action: 'admin_login',
        adminId,
        password,
      });

      if (result.success) setToken(result.token);
      return result;
    },

    logout(): void {
      setToken(null);
    },

    getData(): Promise<ApiResult<AdminData>> {
      return adminCall<AdminData>('admin_get_data', {}, 90_000);
    },

    /** Returns the screenshot as base64 plus its MIME type. */
    getScreenshot(regId: string): Promise<ApiResult<{ mimeType: string; base64: string }>> {
      return adminCall('admin_get_screenshot', { regId }, 90_000);
    },

    verifyPayment(regId: string, note?: string): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_verify_payment', { regId, note: note ?? '' });
    },

    /** Rejecting cancels the registration and frees every member's slot. */
    rejectPayment(regId: string, note?: string): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_reject_payment', { regId, note: note ?? '' });
    },

    cancelRegistration(regId: string, note?: string): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_cancel', { regId, note: note ?? '' });
    },

    /**
     * Replaces oldCollegeId with newMember.
     *
     * If the member being replaced is the captain, newCaptainId may name another
     * active member; otherwise the new member becomes captain.
     */
    swapMember(
      regId: string,
      oldCollegeId: string,
      newMember: Person,
      newCaptainId?: string,
    ): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_swap_member', { regId, oldCollegeId, newMember, newCaptainId });
    },

    /** newCaptainId is required when removing the current captain. */
    removeMember(regId: string, collegeId: string, newCaptainId?: string): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_remove_member', { regId, collegeId, newCaptainId });
    },

    changeCaptain(regId: string, collegeId: string): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_change_captain', { regId, collegeId });
    },

    editParticipant(collegeId: string, fields: Partial<Omit<Person, 'collegeId'>>): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_edit_participant', { collegeId, fields });
    },

    /**
     * Records an admin export (CSV download, copied emails) so it shows in Admin_Log.
     * Call it right before or after the browser builds the file / copies the text.
     */
    logExport(kind: ExportKind, eventId: string, count: number): Promise<ApiResult<MessageResult>> {
      return adminCall('admin_log_export', { kind, eventId, count });
    },
  },
};

// ---------------------------------------------------------------------------
// Small helpers for the registration form
// ---------------------------------------------------------------------------

/** Reads a file as a data URL (data:image/png;base64,...), which the backend accepts. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

/** New idempotency key for one submit attempt. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/** Type guard that narrows an ApiResult to its failure branch. */
export function isFailure<T>(r: ApiResult<T>): r is Failure {
  return r.success === false;
}