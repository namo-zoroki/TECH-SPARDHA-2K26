import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, isFailure } from '@/src/services/api';
import type {
  AdminData,
  AdminMember,
  AdminRegistration,
  ApiResult,
  EventInfo,
  MessageResult,
  PayStatus,
  Person,
  RegStatus,
} from '@/src/services/api';
import {
  BRANCH_CODES,
  YEAR_OPTIONS,
  emptyPerson,
  toApiPerson,
  updatePerson,
  validatePerson,
  yearsForBranch,
} from '@/src/config/constants';
import type { PersonErrors } from '@/src/config/constants';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Search, Download, RefreshCw, CheckCircle, XCircle, X, Copy } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const PAGE_SIZE = 100;

const fieldCls =
  'w-full h-11 bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/20 focus:border-cyan-500/50 outline-none disabled:opacity-50';
const selectCls =
  'w-full h-11 bg-neutral-900 border border-white/10 px-3 text-sm text-white focus:border-cyan-500/50 outline-none appearance-none disabled:opacity-50';
const labelCls = 'block text-[10px] uppercase tracking-widest text-white/40 mb-1';

const REG_LABEL: Record<RegStatus, string> = {
  confirmed: 'Confirmed',
  pending_verification: 'Pending payment',
  cancelled: 'Cancelled',
};
const REG_STYLE: Record<RegStatus, string> = {
  confirmed: 'bg-green-500/10 text-green-500',
  pending_verification: 'bg-yellow-500/10 text-yellow-500',
  cancelled: 'bg-red-500/10 text-red-500',
};
const PAY_LABEL: Record<PayStatus, string> = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected' };
const PAY_STYLE: Record<PayStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  verified: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
};
const FLAG_LABEL: Record<string, string> = {
  BRANCH_MISMATCH: 'Branch differs from College ID',
  CONTACT_DIFFERS: 'Contact details differ from an earlier registration',
};

const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={cn('inline-block text-[10px] px-2 py-1 uppercase font-bold tracking-wide', className)}>{children}</span>
);

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <label className="block">
    <span className={labelCls}>{label}</span>
    {children}
    {error && <span className="block mt-1 text-xs text-red-500">{error}</span>}
  </label>
);

const activeMembers = (reg: AdminRegistration): AdminMember[] => reg.members.filter((m) => m.active);
const captainOf = (reg: AdminRegistration): AdminMember | undefined =>
  reg.members.find((m) => m.collegeId === reg.captainId);
const splitFlags = (flags: string): string[] =>
  flags
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// CSV and clipboard
// ---------------------------------------------------------------------------

/** Quotes a cell and neutralises spreadsheet formulas (=, +, -, @, tab, CR). */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const text = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall back below */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const done = document.execCommand('copy');
    ta.remove();
    return done;
  } catch {
    return false;
  }
}

const today = (): string => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const LoginForm: React.FC<{ notice: string; onSuccess: (name: string) => void }> = ({ notice, onSuccess }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId.trim() || !password) {
      setError('Enter your Admin ID and password.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await apiService.admin.login(adminId.trim(), password);
    setBusy(false);
    if (isFailure(result)) {
      setError(result.message);
      return;
    }
    setPassword('');
    onSuccess(result.name);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-md p-8 bg-neutral-900 border border-white/10">
        <h2 className="text-2xl font-bold uppercase mb-2">Admin Access</h2>
        <p className="text-xs text-white/40 mb-8">Your name is saved in the audit log next to every change you make.</p>
        <form onSubmit={submit} className="space-y-6">
          <Input
            type="text"
            label="Admin ID"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="e.g. admin1"
            autoComplete="username"
          />
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
          {notice && !error && <p className="text-xs text-yellow-500">{notice}</p>}
          {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
          <Button variant="secondary" className="w-full" isLoading={busy}>
            Login to Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Person form (swap and edit)
// ---------------------------------------------------------------------------

const PersonForm: React.FC<{
  person: Person;
  errors: PersonErrors;
  lockId?: boolean;
  onChange: (field: keyof Person, value: string) => void;
}> = ({ person, errors, lockId, onChange }) => {
  const yearValues = person.branch ? yearsForBranch(person.branch) : YEAR_OPTIONS.map((y) => y.value as string);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Full name" error={errors.fullName}>
        <input className={fieldCls} value={person.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
      </Field>
      <Field label="College ID" error={errors.collegeId}>
        <input
          className={cn(fieldCls, 'font-mono')}
          value={person.collegeId}
          disabled={lockId}
          placeholder="A2026IT11257"
          onChange={(e) => onChange('collegeId', e.target.value)}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <input className={fieldCls} type="email" value={person.email} onChange={(e) => onChange('email', e.target.value)} />
      </Field>
      <Field label="Phone" error={errors.phone}>
        <input
          className={fieldCls}
          type="tel"
          inputMode="tel"
          value={person.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </Field>
      <Field label="Year" error={errors.year}>
        <select className={selectCls} value={person.year} onChange={(e) => onChange('year', e.target.value)}>
          <option value="">Select year</option>
          {YEAR_OPTIONS.filter((y) => yearValues.includes(y.value)).map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Branch" error={errors.branch}>
        <select className={selectCls} value={person.branch} onChange={(e) => onChange('branch', e.target.value)}>
          <option value="">Select branch</option>
          {BRANCH_CODES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action confirmation panel
// ---------------------------------------------------------------------------

type Action =
  | { kind: 'verify' }
  | { kind: 'reject' }
  | { kind: 'cancel' }
  | { kind: 'captain'; collegeId: string }
  | { kind: 'remove'; collegeId: string }
  | { kind: 'swap'; collegeId: string }
  | { kind: 'edit'; collegeId: string };

interface PanelProps {
  reg: AdminRegistration;
  event: EventInfo | undefined;
  action: Action;
  onDone: (message: string) => void;
  onClose: () => void;
  onAuthLost: () => void;
}

const ActionPanel: React.FC<PanelProps> = ({ reg, event, action, onDone, onClose, onAuthLost }) => {
  const members = activeMembers(reg);
  const target = 'collegeId' in action ? members.find((m) => m.collegeId === action.collegeId) : undefined;
  const targetIsCaptain = !!target && target.collegeId === reg.captainId;
  const others = members.filter((m) => m.collegeId !== target?.collegeId);

  const [note, setNote] = useState('');
  const [captainChoice, setCaptainChoice] = useState('');
  const [person, setPerson] = useState<Person>(() =>
    action.kind === 'edit' && target
      ? {
          fullName: target.fullName,
          collegeId: target.collegeId,
          email: target.email,
          phone: target.phone,
          year: target.year,
          branch: target.branch,
        }
      : emptyPerson()
  );
  const [errors, setErrors] = useState<PersonErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const showNote = action.kind === 'verify' || action.kind === 'reject' || action.kind === 'cancel';

  // Team-size guidance for removals.
  const remaining = members.length - 1;
  const exactSize = reg.game && event ? event.gameSizes[reg.game] : undefined;
  const belowMin = action.kind === 'remove' && !!event && remaining < event.teamMin;
  const sizeWarning =
    action.kind === 'remove' && !belowMin && exactSize && remaining !== exactSize
      ? `${reg.game} needs exactly ${exactSize} players. After this the team would have ${remaining}.`
      : '';

  const copy: { title: string; text: string; button: string; danger: boolean } = (() => {
    switch (action.kind) {
      case 'verify':
        return { title: 'Verify payment', text: 'Marks the payment as verified. The registration becomes confirmed.', button: 'Verify payment', danger: false };
      case 'reject':
        return {
          title: 'Reject payment',
          text: "Rejects the payment and cancels the registration. Every member's slot is freed and the team has to register again.",
          button: 'Reject and cancel',
          danger: true,
        };
      case 'cancel':
        return {
          title: 'Cancel registration',
          text: 'Cancels the registration and frees every member slot. A pending payment is marked rejected so its UTR can be used again. Refunds for verified payments are handled outside this system.',
          button: 'Cancel registration',
          danger: true,
        };
      case 'captain':
        return { title: 'Change captain', text: `Make ${target?.fullName || action.collegeId} the team captain.`, button: 'Change captain', danger: false };
      case 'remove':
        return {
          title: 'Remove member',
          text: `Remove ${target?.fullName || action.collegeId} from the team. Their slot is freed.`,
          button: 'Remove member',
          danger: true,
        };
      case 'swap':
        return {
          title: 'Swap member',
          text: `Replace ${target?.fullName || action.collegeId} with another student. The new student must be free in this event's slot.`,
          button: 'Swap member',
          danger: false,
        };
      case 'edit':
        return {
          title: 'Edit participant details',
          text: 'Changes apply to this student everywhere, including their other registrations.',
          button: 'Save changes',
          danger: false,
        };
    }
  })();

  const onPersonChange = (field: keyof Person, value: string) => {
    setPerson((prev) => updatePerson(prev, field, value));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async () => {
    setError('');
    let exec: () => Promise<ApiResult<MessageResult>>;

    switch (action.kind) {
      case 'verify':
        exec = () => apiService.admin.verifyPayment(reg.regId, note.trim());
        break;
      case 'reject':
        exec = () => apiService.admin.rejectPayment(reg.regId, note.trim());
        break;
      case 'cancel':
        exec = () => apiService.admin.cancelRegistration(reg.regId, note.trim());
        break;
      case 'captain':
        exec = () => apiService.admin.changeCaptain(reg.regId, action.collegeId);
        break;
      case 'remove': {
        if (targetIsCaptain && !captainChoice) {
          setError('Choose the new captain first.');
          return;
        }
        exec = () => apiService.admin.removeMember(reg.regId, action.collegeId, targetIsCaptain ? captainChoice : undefined);
        break;
      }
      case 'swap': {
        const errs = validatePerson(person);
        if (Object.keys(errs).length) {
          setErrors(errs);
          return;
        }
        const clean = toApiPerson(person);
        if (members.some((m) => m.collegeId === clean.collegeId)) {
          setErrors({ collegeId: 'This student is already on the team.' });
          return;
        }
        exec = () =>
          apiService.admin.swapMember(reg.regId, action.collegeId, clean, targetIsCaptain && captainChoice ? captainChoice : undefined);
        break;
      }
      case 'edit': {
        const errs = validatePerson(person);
        if (Object.keys(errs).length) {
          setErrors(errs);
          return;
        }
        const clean = toApiPerson(person);
        exec = () =>
          apiService.admin.editParticipant(action.collegeId, {
            fullName: clean.fullName,
            email: clean.email,
            phone: clean.phone,
            year: clean.year,
            branch: clean.branch,
          });
        break;
      }
    }

    setBusy(true);
    const result = await exec();
    setBusy(false);
    if (isFailure(result)) {
      if (result.error === 'AUTH_REQUIRED') {
        onAuthLost();
        return;
      }
      setError(result.message);
      return;
    }
    onDone(result.message);
  };

  return (
    <div className={cn('border p-5 space-y-4', copy.danger ? 'border-red-500/30 bg-red-500/5' : 'border-cyan-500/30 bg-cyan-500/5')}>
      <div>
        <p className="font-bold">{copy.title}</p>
        <p className="text-sm text-white/60 mt-1">{copy.text}</p>
      </div>

      {action.kind === 'remove' && targetIsCaptain && (
        <Field label="New captain">
          <select className={selectCls} value={captainChoice} onChange={(e) => setCaptainChoice(e.target.value)}>
            <option value="">Choose a member</option>
            {others.map((m) => (
              <option key={m.collegeId} value={m.collegeId}>
                {m.fullName} ({m.collegeId})
              </option>
            ))}
          </select>
        </Field>
      )}

      {action.kind === 'swap' && (
        <>
          <PersonForm person={person} errors={errors} onChange={onPersonChange} />
          {targetIsCaptain && (
            <Field label="New captain (the replaced member was captain)">
              <select className={selectCls} value={captainChoice} onChange={(e) => setCaptainChoice(e.target.value)}>
                <option value="">The new member</option>
                {others.map((m) => (
                  <option key={m.collegeId} value={m.collegeId}>
                    {m.fullName} ({m.collegeId})
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}

      {action.kind === 'edit' && <PersonForm person={person} errors={errors} lockId onChange={onPersonChange} />}

      {showNote && (
        <Field label="Note (optional)">
          <input
            className={fieldCls}
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Saved with this change"
          />
        </Field>
      )}

      {belowMin && event && (
        <p className="text-sm text-red-500">
          Cannot remove: {event.name} needs at least {event.teamMin} member{event.teamMin === 1 ? '' : 's'}. Swap the member instead.
        </p>
      )}
      {sizeWarning && <p className="text-sm text-yellow-500">{sizeWarning} You can still continue.</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button variant={copy.danger ? 'outline' : 'secondary'} size="sm" onClick={submit} isLoading={busy} disabled={belowMin}>
          {copy.button}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          Keep as is
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Registration detail
// ---------------------------------------------------------------------------

const MemberCard: React.FC<{
  member: AdminMember;
  isCaptain: boolean;
  muted?: boolean;
  onAction?: (a: Action) => void;
}> = ({ member, isCaptain, muted, onAction }) => (
  <div className={cn('border border-white/10 p-4', muted && 'opacity-50')}>
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-bold">{member.fullName || member.collegeId}</span>
      {isCaptain && <Badge className="bg-cyan-500/10 text-cyan-500">Captain</Badge>}
      {splitFlags(member.flags).map((f) => (
        <Badge key={f} className="bg-yellow-500/10 text-yellow-500">
          {FLAG_LABEL[f] ?? f}
        </Badge>
      ))}
    </div>
    <p className="text-xs text-white/50 mt-1 font-mono">
      {member.collegeId} / {member.year} year / {member.branch}
    </p>
    <p className="text-sm text-white/70 mt-1 break-all">
      {member.email} / {member.phone}
    </p>
    {onAction && (
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'edit', collegeId: member.collegeId })}>
          Edit details
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'swap', collegeId: member.collegeId })}>
          Swap
        </Button>
        {!isCaptain && (
          <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'captain', collegeId: member.collegeId })}>
            Make captain
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'remove', collegeId: member.collegeId })}>
          Remove
        </Button>
      </div>
    )}
  </div>
);

type Shot = { state: 'idle' | 'loading' | 'ready' | 'error'; src: string; message: string };

const RegistrationDetail: React.FC<{
  reg: AdminRegistration;
  event: EventInfo | undefined;
  onClose: () => void;
  onChanged: (message: string) => void;
  onAuthLost: () => void;
}> = ({ reg, event, onClose, onChanged, onAuthLost }) => {
  const [action, setAction] = useState<Action | null>(null);
  const [shot, setShot] = useState<Shot>({ state: 'idle', src: '', message: '' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const cancelled = reg.status === 'cancelled';
  const current = cancelled ? reg.members : activeMembers(reg);
  const former = cancelled ? [] : reg.members.filter((m) => !m.active);
  const pay = reg.payment;
  const canVerify = !!pay && pay.status === 'pending' && !cancelled;

  const loadShot = async () => {
    setShot({ state: 'loading', src: '', message: '' });
    const r = await apiService.admin.getScreenshot(reg.regId);
    if (isFailure(r)) {
      if (r.error === 'AUTH_REQUIRED') {
        onAuthLost();
        return;
      }
      setShot({ state: 'error', src: '', message: r.message });
      return;
    }
    const mime = r.mimeType === 'image/png' || r.mimeType === 'image/jpeg' ? r.mimeType : '';
    if (!mime) {
      setShot({ state: 'error', src: '', message: 'The stored file is not a JPG or PNG image.' });
      return;
    }
    setShot({ state: 'ready', src: `data:${mime};base64,${r.base64}`, message: '' });
  };

  const done = (message: string) => {
    setAction(null);
    onChanged(message);
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Registration ${reg.regId}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-white/10">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div>
            <p className="font-mono text-cyan-500 text-sm">{reg.regId}</p>
            <h2 className="text-2xl font-bold mt-1">{reg.teamName || captainOf(reg)?.fullName || 'Solo registration'}</h2>
            <p className="text-sm text-white/60 mt-1">
              {reg.eventName}
              {reg.game ? ` / ${reg.game}` : ''} / {reg.teamSize} member{reg.teamSize === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-white/40 mt-1">Registered {reg.timestamp}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={REG_STYLE[reg.status]}>{REG_LABEL[reg.status]}</Badge>
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {pay && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-white/40">Payment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className={labelCls}>Status</p>
                  <Badge className={PAY_STYLE[pay.status]}>{PAY_LABEL[pay.status]}</Badge>
                </div>
                <div>
                  <p className={labelCls}>Amount</p>
                  <p>₹{pay.amount}</p>
                </div>
                <div>
                  <p className={labelCls}>UTR</p>
                  <p className="font-mono break-all">{pay.utr}</p>
                </div>
                <div>
                  <p className={labelCls}>Submitted</p>
                  <p>{pay.submittedAt}</p>
                </div>
                {pay.verifiedBy && (
                  <div>
                    <p className={labelCls}>Handled by</p>
                    <p>
                      {pay.verifiedBy} <span className="text-white/40">{pay.verifiedAt}</span>
                    </p>
                  </div>
                )}
                {pay.note && (
                  <div className="col-span-2">
                    <p className={labelCls}>Note</p>
                    <p className="break-words">{pay.note}</p>
                  </div>
                )}
              </div>

              {pay.hasScreenshot && (
                <div>
                  {shot.state === 'idle' && (
                    <Button variant="outline" size="sm" onClick={loadShot}>
                      Show screenshot
                    </Button>
                  )}
                  {shot.state === 'loading' && <p className="text-sm text-white/50">Loading screenshot...</p>}
                  {shot.state === 'error' && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-500">{shot.message}</p>
                      <Button variant="outline" size="sm" onClick={loadShot}>
                        Try again
                      </Button>
                    </div>
                  )}
                  {shot.state === 'ready' && (
                    <img src={shot.src} alt={`Payment screenshot for ${reg.regId}`} className="max-h-[480px] max-w-full border border-white/10" />
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-white/40">
              {cancelled ? 'Members on record' : 'Team members'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {current.map((m) => (
                <MemberCard
                  key={m.collegeId}
                  member={m}
                  isCaptain={m.collegeId === reg.captainId}
                  onAction={cancelled ? undefined : setAction}
                />
              ))}
            </div>
            {former.length > 0 && (
              <>
                <h3 className="text-xs uppercase tracking-widest text-white/40 pt-2">Removed or replaced</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {former.map((m, i) => (
                    <MemberCard key={m.collegeId + i} member={m} isCaptain={false} muted />
                  ))}
                </div>
              </>
            )}
          </section>

          {!cancelled && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-white/40">Registration actions</h3>
              <div className="flex flex-wrap gap-3">
                {canVerify && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setAction({ kind: 'verify' })}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Verify payment
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAction({ kind: 'reject' })}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject payment
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setAction({ kind: 'cancel' })}>
                  Cancel registration
                </Button>
              </div>
            </section>
          )}

          {action && (
            <ActionPanel
              key={JSON.stringify(action)}
              reg={reg}
              event={event}
              action={action}
              onDone={done}
              onClose={() => setAction(null)}
              onAuthLost={onAuthLost}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const AdminDashboard: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(() => apiService.admin.hasSession());
  const [adminName, setAdminName] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RegStatus>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAuthLost = useCallback(() => {
    apiService.admin.logout();
    setAuthed(false);
    setData(null);
    setSelectedId(null);
    setAdminName('');
    setLoginNotice('Your session expired. Please log in again.');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const r = await apiService.admin.getData();
    setLoading(false);
    if (isFailure(r)) {
      if (r.error === 'AUTH_REQUIRED') handleAuthLost();
      else setLoadError(r.message);
      return;
    }
    setData(r);
  }, [handleAuthLost]);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => setVisible(PAGE_SIZE), [search, eventFilter, statusFilter]);

  const eventById = useMemo(() => {
    const m = new Map<string, EventInfo>();
    data?.events.forEach((e) => m.set(e.eventId, e));
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.registrations
      .filter((reg) => {
        if (eventFilter !== 'all' && reg.eventId !== eventFilter) return false;
        if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
        if (!q) return true;
        return (
          reg.regId.toLowerCase().includes(q) ||
          reg.teamName.toLowerCase().includes(q) ||
          reg.members.some((m) => m.collegeId.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q))
        );
      })
      .reverse(); // newest first
  }, [data, search, eventFilter, statusFilter]);

  const selected = selectedId && data ? data.registrations.find((r) => r.regId === selectedId) : undefined;

  const logout = () => {
    apiService.admin.logout();
    setAuthed(false);
    setData(null);
    setSelectedId(null);
    setAdminName('');
    setLoginNotice('');
  };

  const onChanged = (message: string) => {
    setNotice(message);
    void load();
  };

  // ----- exports -----

  // Records the export in Admin_Log before the data leaves the page.
  // An expired session blocks the export; any other logging failure does not.
  const logExport = async (kind: string, count: number): Promise<boolean> => {
    const r = await apiService.admin.logExport(kind, eventFilter === 'all' ? '' : eventFilter, count);
    if (isFailure(r) && r.error === 'AUTH_REQUIRED') {
      handleAuthLost();
      return false;
    }
    return true;
  };

  const exportRegistrations = async () => {
    if (!(await logExport('registrations_csv', filtered.length))) return;
    downloadCsv(
      `techspardha_registrations_${today()}.csv`,
      ['RegID', 'Registered', 'Event', 'Game', 'Team', 'Members', 'Captain ID', 'Captain', 'Status', 'Payment', 'UTR', 'Amount', 'Updated'],
      filtered.map((r) => [
        r.regId,
        r.timestamp,
        r.eventName,
        r.game,
        r.teamName,
        r.teamSize,
        r.captainId,
        captainOf(r)?.fullName ?? '',
        REG_LABEL[r.status],
        r.payment ? PAY_LABEL[r.payment.status] : 'Free',
        r.payment?.utr ?? '',
        r.payment?.amount ?? '',
        r.updatedAt,
      ])
    );
  };

  const exportContacts = async () => {
    const rows: unknown[][] = [];
    filtered.forEach((r) => {
      if (r.status === 'cancelled') return;
      activeMembers(r).forEach((m) =>
        rows.push([
          r.regId,
          r.eventName,
          r.teamName,
          m.collegeId === r.captainId ? 'Captain' : 'Member',
          m.fullName,
          m.collegeId,
          m.email,
          m.phone,
          m.year,
          m.branch,
        ])
      );
    });
    if (!(await logExport('contacts_csv', rows.length))) return;
    downloadCsv(
      `techspardha_contacts_${today()}.csv`,
      ['RegID', 'Event', 'Team', 'Role', 'Name', 'College ID', 'Email', 'Phone', 'Year', 'Branch'],
      rows
    );
  };

  const copyEmails = async (captainsOnly: boolean) => {
    if (!data) return;
    const seen = new Set<string>();
    data.registrations.forEach((r) => {
      if (r.status === 'cancelled') return;
      if (eventFilter !== 'all' && r.eventId !== eventFilter) return;
      activeMembers(r).forEach((m) => {
        if (captainsOnly && m.collegeId !== r.captainId) return;
        if (m.email) seen.add(m.email.toLowerCase());
      });
    });
    if (!seen.size) {
      setNotice('No emails to copy for this selection.');
      return;
    }
    if (!(await logExport(captainsOnly ? 'copy_captain_emails' : 'copy_all_emails', seen.size))) return;
    const ok = await copyText(Array.from(seen).join(', '));
    setNotice(ok ? `Copied ${seen.size} email${seen.size === 1 ? '' : 's'}.` : 'Could not copy. Your browser blocked clipboard access.');
  };

  // ----- render -----

  if (!authed) {
    return (
      <LoginForm
        notice={loginNotice}
        onSuccess={(name) => {
          setLoginNotice('');
          setAdminName(name);
          setAuthed(true);
        }}
      />
    );
  }

  const stats = data?.stats;
  const cards: { label: string; value: number | string }[] = [
    { label: 'Registrations', value: stats?.totalRegistrations ?? '-' },
    { label: 'Unique participants', value: stats?.uniqueParticipants ?? '-' },
    { label: 'Cancelled', value: stats?.cancelledRegistrations ?? '-' },
    { label: 'Gamer Fiesta pending', value: stats?.payments.pending ?? '-' },
    { label: 'Gamer Fiesta verified', value: stats?.payments.verified ?? '-' },
    { label: 'Gamer Fiesta rejected', value: stats?.payments.rejected ?? '-' },
  ];

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">
              Registration <span className="text-cyan-500">Vault</span>
            </h1>
            <p className="text-white/40 text-sm font-mono uppercase tracking-widest">TechSpardha 2K26 Administrative Control</p>
            {adminName && (
              <p className="text-xs text-white/40 mt-2">
                Logged in as <span className="text-cyan-500">{adminName}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => void load()} isLoading={loading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportRegistrations()} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-2" /> Registrations CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportContacts()} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-2" /> Contacts CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {notice && (
          <div className="mb-6 flex items-start justify-between gap-4 border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Dismiss" className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loadError && (
          <div className="mb-6 border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
            {loadError}{' '}
            <button className="underline" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="p-5 bg-white/5 border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{c.label}</p>
              <p className="text-3xl font-display font-bold">{c.value}</p>
            </div>
          ))}
        </div>

        {stats && data && (
          <div className="flex flex-wrap gap-2 mb-10">
            {data.events.map((e) => (
              <button
                key={e.eventId}
                onClick={() => setEventFilter(eventFilter === e.eventId ? 'all' : e.eventId)}
                className={cn(
                  'px-3 py-2 text-xs border transition-colors',
                  eventFilter === e.eventId ? 'border-cyan-500 text-cyan-500' : 'border-white/10 text-white/60 hover:border-white/30'
                )}
              >
                {e.name}: <span className="font-bold">{stats.perEvent[e.eventId]?.total ?? 0}</span>
                {!e.open && <span className="ml-2 text-red-500">closed</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              className="w-full h-12 bg-white/5 border border-white/10 pl-12 pr-4 text-sm focus:border-cyan-500/50 outline-none"
              placeholder="Search by Reg ID, College ID, name or team"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search registrations"
            />
          </div>
          <select
            className="lg:w-60 h-12 bg-neutral-900 border border-white/10 px-4 text-sm focus:border-cyan-500/50 outline-none appearance-none"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            aria-label="Filter by event"
          >
            <option value="all">All events</option>
            {data?.events.map((e) => (
              <option key={e.eventId} value={e.eventId}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            className="lg:w-52 h-12 bg-neutral-900 border border-white/10 px-4 text-sm focus:border-cyan-500/50 outline-none appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | RegStatus)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_verification">Pending payment</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={() => void copyEmails(false)} disabled={!data}>
            <Copy className="w-4 h-4 mr-2" /> Copy all emails
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copyEmails(true)} disabled={!data}>
            <Copy className="w-4 h-4 mr-2" /> Copy captain emails
          </Button>
          <p className="text-xs text-white/40">
            Email copy follows the event filter and skips cancelled teams. CSV exports follow every filter above.
          </p>
        </div>

        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-white/60">
                <th className="px-6 py-4 font-bold border-b border-white/10">Reg ID</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Team</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Event</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Payment</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Status</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Registered</th>
                <th className="px-6 py-4 font-bold border-b border-white/10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, visible).map((reg) => {
                const cap = captainOf(reg);
                const flagged = reg.members.some((m) => m.active && splitFlags(m.flags).length > 0);
                return (
                  <tr
                    key={reg.regId}
                    className="hover:bg-white/[0.02] transition-colors text-sm cursor-pointer"
                    onClick={() => setSelectedId(reg.regId)}
                  >
                    <td className="px-6 py-4 font-mono text-cyan-500 whitespace-nowrap">{reg.regId}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{reg.teamName || cap?.fullName || reg.captainId}</div>
                      <div className="text-xs text-white/40">
                        {reg.teamName ? `${cap?.fullName ?? reg.captainId} / ` : ''}
                        {reg.teamSize} member{reg.teamSize === 1 ? '' : 's'}
                        {flagged && <span className="ml-2 text-yellow-500">needs a look</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{reg.eventName}</div>
                      {reg.game && <div className="text-xs text-white/40">{reg.game}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {reg.payment ? (
                        <Badge className={PAY_STYLE[reg.payment.status]}>{PAY_LABEL[reg.payment.status]}</Badge>
                      ) : (
                        <span className="text-white/30 text-xs">Free</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={REG_STYLE[reg.status]}>{REG_LABEL[reg.status]}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50 whitespace-nowrap">{reg.timestamp}</td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedId(reg.regId);
                        }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data && loading && <div className="py-20 text-center text-white/30 text-sm">Loading registrations...</div>}
          {data && filtered.length === 0 && (
            <div className="py-20 text-center text-white/30 text-sm">
              {data.registrations.length === 0 ? 'No registrations yet.' : 'No registrations match these filters.'}
            </div>
          )}
        </div>

        {filtered.length > visible && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} left)
            </Button>
          </div>
        )}
      </div>

      {selected && (
        <RegistrationDetail
          key={selected.regId}
          reg={selected}
          event={eventById.get(selected.eventId)}
          onClose={() => setSelectedId(null)}
          onChanged={onChanged}
          onAuthLost={handleAuthLost}
        />
      )}
    </div>
  );
};