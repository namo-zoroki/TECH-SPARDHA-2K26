import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input, Select } from "./ui/Input";
import { cn } from "@/src/lib/utils";
import {
  apiService,
  fileToDataUrl,
  newIdempotencyKey,
  isFailure,
  type EventInfo,
  type Person,
  type RegisterPayload,
  type RegisterSuccess,
} from "@/src/services/api";
import {
  BRANCH_CODES,
  COLLEGE_ID_EXAMPLE,
  COLLEGE_ID_REGEX,
  EMAIL_HINT,
  MAX_SCREENSHOT_BYTES,
  NAME_MAX,
  SLOT_GROUPS,
  TEAM_NAME_CHECK_DEBOUNCE_MS,
  TEAM_NAME_HINT,
  TEAM_NAME_MAX,
  UPI_ID,
  YEAR_OPTIONS,
  buildUpiLink,
  emptyPerson,
  normalizeCollegeId,
  teamNameFormatError,
  toApiPerson,
  updatePerson,
  validatePerson,
  yearsForBranch,
  type PersonErrors,
} from "@/src/config/constants";

// ---------------------------------------------------------------------------
// Types and small helpers
// ---------------------------------------------------------------------------

type StepId = 1 | 2 | 3 | 4 | 5;

interface Shot {
  file: File;
  preview: string;
}

interface Draft {
  step: StepId;
  eventId: string;
  captain: Person;
  teamName: string;
  game: string;
  members: Person[];
  utr: string;
  key: string;
}

interface SubmitError {
  message: string;
  list: string[];
  retry: boolean;
}

/** Result of the live team-name check, tied to the exact name + captain it was asked for. */
interface NameCheckState {
  key: string;
  status: "checking" | "ok" | "taken";
  message: string;
}

const DRAFT_KEY = "ts26_registration_draft_v1";
const RETRYABLE = ["NETWORK_ERROR", "TIMEOUT", "BAD_RESPONSE", "SERVER_ERROR", "BUSY"];
const NAME_TAKEN_FALLBACK = "This team name is already taken. Please choose another.";

const STEP_TITLES: Record<StepId, string> = {
  1: "Select Your Event",
  2: "Your Details",
  3: "Team Details",
  4: "Payment",
  5: "Review & Submit",
};

const isTeamEvent = (ev?: EventInfo) => !!ev && ev.teamMax > 1;

function stepsFor(ev?: EventInfo): StepId[] {
  const s: StepId[] = [1, 2];
  if (isTeamEvent(ev)) s.push(3);
  if (ev && ev.fee > 0) s.push(4);
  s.push(5);
  return s;
}

/** Exact size when a game fixes it, otherwise the event's range. */
function teamBounds(ev: EventInfo, game: string): { min: number; max: number } {
  const exact = game ? ev.gameSizes[game] : undefined;
  return exact ? { min: exact, max: exact } : { min: ev.teamMin, max: ev.teamMax };
}

function teamLabel(ev: EventInfo): string {
  if (ev.games.length && Object.keys(ev.gameSizes).length) {
    return "Players: " + ev.games.map((g) => (ev.gameSizes[g] ? `${g} ${ev.gameSizes[g]}` : g)).join(" · ");
  }
  if (ev.teamMax === 1) return "Solo";
  if (ev.teamMin === ev.teamMax) return ev.teamMax === 2 ? "Duo (2 players)" : `Team of ${ev.teamMax}`;
  return ev.teamMin === 1 ? `Solo or team of up to ${ev.teamMax}` : `Team of ${ev.teamMin} to ${ev.teamMax}`;
}

function cleanPerson(x: unknown): Person {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return {
    fullName: s("fullName"),
    collegeId: s("collegeId"),
    email: s("email"),
    phone: s("phone"),
    year: s("year"),
    branch: s("branch"),
  };
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d || typeof d !== "object") return null;
    const eventId = typeof d.eventId === "string" ? d.eventId : "";
    const step = [1, 2, 3, 4, 5].includes(d.step as number) && eventId ? (d.step as StepId) : 1;
    const key = typeof d.key === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(d.key) ? d.key : newIdempotencyKey();
    return {
      step,
      eventId,
      captain: cleanPerson(d.captain),
      teamName: typeof d.teamName === "string" ? d.teamName : "",
      game: typeof d.game === "string" ? d.game : "",
      members: Array.isArray(d.members) ? d.members.slice(0, 20).map(cleanPerson) : [],
      utr: typeof d.utr === "string" ? d.utr.replace(/\D/g, "").slice(0, 12) : "",
      key,
    };
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); // the screenshot is never saved
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// One person's fields (captain or member). Defined at module level so inputs keep focus.
// ---------------------------------------------------------------------------

interface PersonFieldsProps {
  prefix: string;
  person: Person;
  errors: PersonErrors;
  visible: (key: string) => boolean;
  onChange: (field: keyof Person, value: string) => void;
  onTouch: (key: string) => void;
}

const PersonFields: React.FC<PersonFieldsProps> = ({ prefix, person, errors, visible, onChange, onTouch }) => {
  const err = (f: keyof Person) => (visible(`${prefix}.${f}`) ? errors[f] : undefined);
  const yearAllowed = yearsForBranch(person.branch);

  return (
    <div
      className="grid md:grid-cols-2 gap-6"
      onBlur={(e) => {
        const name = (e.target as HTMLElement).getAttribute("name");
        if (name) onTouch(`${prefix}.${name}`);
      }}
    >
      <Input
        label="Full Name"
        name="fullName"
        value={person.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        placeholder="Enter full name"
        maxLength={NAME_MAX}
        autoComplete="off"
        error={err("fullName")}
      />
      <Input
        label="College ID"
        name="collegeId"
        value={person.collegeId}
        onChange={(e) => onChange("collegeId", e.target.value)}
        placeholder={`e.g. ${COLLEGE_ID_EXAMPLE}`}
        maxLength={20}
        autoCapitalize="characters"
        autoComplete="off"
        error={err("collegeId")}
      />
      <div className="space-y-1.5">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={person.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="name@gmail.com"
          maxLength={254}
          autoComplete="off"
          error={err("email")}
        />
        <p className="text-[10px] text-white/40 tracking-wide">{EMAIL_HINT}</p>
      </div>
      <Input
        label="Mobile Number"
        name="phone"
        type="tel"
        inputMode="tel"
        value={person.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        placeholder="10-digit mobile number"
        maxLength={14}
        autoComplete="off"
        error={err("phone")}
      />
      <Select
        label="Current Year"
        name="year"
        value={person.year}
        onChange={(e) => onChange("year", e.target.value)}
        disabled={person.branch === "ASH"}
        options={[
          { label: "Select year", value: "" },
          ...YEAR_OPTIONS.filter((y) => yearAllowed.includes(y.value)).map((y) => ({ label: y.label, value: y.value })),
        ]}
        error={err("year")}
      />
      <div className="space-y-1.5">
        <Select
          label="Branch"
          name="branch"
          value={person.branch}
          onChange={(e) => onChange("branch", e.target.value)}
          options={[
            { label: "Select branch", value: "" },
            ...BRANCH_CODES.map((b) => ({ label: b === "ASH" ? "ASH (1st year B.Tech)" : b, value: b })),
          ]}
          error={err("branch")}
        />
        <p className="text-[10px] text-white/40 tracking-wide">1st year B.Tech students: choose ASH.</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

export const RegistrationForm: React.FC = () => {
  const [initial] = useState<Draft | null>(loadDraft);

  const [events, setEvents] = useState<EventInfo[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [step, setStep] = useState<StepId>(initial?.step ?? 1);
  const [eventId, setEventId] = useState(initial?.eventId ?? "");
  const [captain, setCaptain] = useState<Person>(initial?.captain ?? emptyPerson());
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [game, setGame] = useState(initial?.game ?? "");
  const [members, setMembers] = useState<Person[]>(initial?.members ?? []);
  const [utr, setUtr] = useState(initial?.utr ?? "");
  const [shot, setShot] = useState<Shot | null>(null);
  const [shotError, setShotError] = useState("");
  const [consent, setConsent] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [pendingGame, setPendingGame] = useState<{ game: string; need: number; remove: number[] } | null>(null);
  const [nameCheck, setNameCheck] = useState<NameCheckState | null>(null);

  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [success, setSuccess] = useState<RegisterSuccess | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedReg, setCopiedReg] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const keyRef = useRef<string>(initial?.key ?? newIdempotencyKey());
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingEventRef = useRef<string | null>(null);
  const sanitizedRef = useRef(false);

  // ----- load events from the backend (the Events sheet is the source of truth) -----
  const loadEvents = useCallback(async () => {
    setEventsError(null);
    const res = await apiService.getEvents();
    if (isFailure(res)) {
      setEventsError(res.message);
      return;
    }
    setEvents(res.events);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const selectedEvent = useMemo(() => events?.find((e) => e.eventId === eventId), [events, eventId]);
  const isTeam = isTeamEvent(selectedEvent);
  const needsPay = !!selectedEvent && selectedEvent.fee > 0;
  const hasGames = !!selectedEvent && selectedEvent.games.length > 0;
  const steps = stepsFor(selectedEvent);
  const bounds = selectedEvent ? teamBounds(selectedEvent, game) : { min: 1, max: 1 };
  const memberCount = 1 + members.length;

  // ----- restored draft: drop it if the event vanished or closed -----
  useEffect(() => {
    if (!events || sanitizedRef.current) return;
    sanitizedRef.current = true;
    if (!eventId) {
      if (step !== 1) setStep(1);
      return;
    }
    const ev = events.find((e) => e.eventId === eventId);
    if (!ev || !ev.open) {
      setEventId("");
      setStep(1);
      return;
    }
    if (game && !ev.games.includes(game)) setGame("");
    if (step === 5 && ev.fee > 0) setStep(4); // the screenshot is not saved in the draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // ----- keep the member list at least as long as the minimum team size -----
  useEffect(() => {
    if (!selectedEvent || !isTeam) return;
    if (hasGames && !game) return;
    const need = bounds.min - 1;
    setMembers((prev) => (prev.length < need ? [...prev, ...Array.from({ length: need - prev.length }, () => emptyPerson())] : prev));
  }, [selectedEvent, isTeam, hasGames, game, bounds.min]);

  // ----- a step that does not apply to this event is skipped -----
  useEffect(() => {
    if (success || !selectedEvent) return;
    if (!steps.includes(step)) setStep(2);
  }, [selectedEvent, step, steps, success]);

  // ----- save the draft (never the screenshot, never the consent) -----
  useEffect(() => {
    if (success) return;
    saveDraft({ step, eventId, captain, teamName, game, members, utr, key: keyRef.current });
  }, [step, eventId, captain, teamName, game, members, utr, success]);

  const scrollToCard = () =>
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);

  // ----- choosing an event -----
  const chooseEvent = useCallback(
    (ev: EventInfo) => {
      if (!ev.open) return;
      setNotice(null);
      if (success || ev.eventId !== eventId) {
        setEventId(ev.eventId);
        setGame("");
        setTeamName("");
        setMembers([]);
        setUtr("");
        setShot(null);
        setShotError("");
        setConsent(false);
        setPendingGame(null);
        setSubmitError(null);
        setTouched({});
        setAttempted({});
        setNameCheck(null);
        keyRef.current = newIdempotencyKey();
      }
      setSuccess(null);
      setStep(2);
    },
    [eventId, success],
  );

  // ----- event cards elsewhere on the page ask us to select an event -----
  useEffect(() => {
    const apply = (id: string) => {
      const ev = events?.find((e) => e.eventId === id);
      if (!ev) return;
      pendingEventRef.current = null;
      if (!ev.open) {
        setNotice(`Registration for ${ev.name} is closed.`);
        return;
      }
      chooseEvent(ev);
    };
    if (events && pendingEventRef.current) apply(pendingEventRef.current);
    const handler = (e: Event) => {
      const id = String((e as CustomEvent).detail ?? "");
      if (!id) return;
      pendingEventRef.current = id;
      apply(id);
    };
    window.addEventListener("select-event", handler);
    return () => window.removeEventListener("select-event", handler);
  }, [events, chooseEvent]);

  // ----- field helpers -----
  const touch = (key: string) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  const clearMemberTouched = () =>
    setTouched((t) => Object.fromEntries(Object.entries(t).filter(([k]) => !k.startsWith("m"))));

  const updateMember = (i: number, field: keyof Person, value: string) =>
    setMembers((prev) => prev.map((m, j) => (j === i ? updatePerson(m, field, value) : m)));

  const addMember = () => setMembers((prev) => [...prev, emptyPerson()]);
  const removeMember = (i: number) => {
    setMembers((prev) => prev.filter((_, j) => j !== i));
    clearMemberTouched();
  };

  // Changing the game may need a smaller team: never remove anyone silently.
  const requestGame = (g: string) => {
    if (!selectedEvent) return;
    if (!g) {
      setGame("");
      return;
    }
    const size = selectedEvent.gameSizes[g] ?? selectedEvent.teamMax;
    if (members.length > size - 1) {
      setPendingGame({ game: g, need: members.length - (size - 1), remove: [] });
      return;
    }
    setGame(g);
  };

  const togglePendingRemoval = (i: number) =>
    setPendingGame((p) => {
      if (!p) return p;
      const remove = p.remove.includes(i) ? p.remove.filter((x) => x !== i) : [...p.remove, i];
      return { ...p, remove };
    });

  const confirmGameChange = () => {
    if (!pendingGame || pendingGame.remove.length !== pendingGame.need) return;
    setMembers((prev) => prev.filter((_, i) => !pendingGame.remove.includes(i)));
    setGame(pendingGame.game);
    setPendingGame(null);
    clearMemberTouched();
  };

  // ----- screenshot -----
  const onShotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setShotError("");
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      setShotError(
        heic
          ? "HEIC photos are not supported. Please upload a JPG or PNG screenshot."
          : "Only JPG or PNG images are allowed. Please upload a JPG or PNG screenshot.",
      );
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setShotError("The screenshot is larger than 2 MB. Please upload a smaller image.");
      return;
    }
    try {
      setShot({ file, preview: await fileToDataUrl(file) });
    } catch {
      setShotError("Could not read that file. Please try another screenshot.");
    }
  };

  const copyText = async (text: string, done: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      done(true);
      setTimeout(() => done(false), 2000);
    } catch {
      /* clipboard blocked: the text is visible on screen anyway */
    }
  };

  // ----- validation -----
  const captainErrors = useMemo(() => validatePerson(captain), [captain]);

  const memberErrors = useMemo<PersonErrors[]>(() => {
    const seen = new Set<string>();
    const c = normalizeCollegeId(captain.collegeId);
    if (c) seen.add(c);
    return members.map((m) => {
      const errs = validatePerson(m);
      const id = normalizeCollegeId(m.collegeId);
      if (id) {
        if (seen.has(id)) errs.collegeId = "This College ID is already in your team (the captain counts as a member).";
        else seen.add(id);
      }
      return errs;
    });
  }, [captain.collegeId, members]);

  const teamNameClean = teamName.trim().replace(/\s+/g, " ");
  const teamNameFormatErr =
    isTeam && (memberCount >= 2 || teamNameClean) ? teamNameFormatError(teamNameClean) || undefined : undefined;

  // ----- live team-name availability (a hint only: the server checks again on submit) -----
  const captainIdForCheck = COLLEGE_ID_REGEX.test(normalizeCollegeId(captain.collegeId))
    ? normalizeCollegeId(captain.collegeId)
    : "";
  const nameCheckKey = `${teamNameClean}|${captainIdForCheck}`;
  const nameCheckable = isTeam && step === 3 && !!teamNameClean && !teamNameFormatError(teamNameClean);

  useEffect(() => {
    if (!nameCheckable) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setNameCheck({ key: nameCheckKey, status: "checking", message: "" });
      const res = await apiService.checkTeamName(teamNameClean, captainIdForCheck || undefined);
      if (cancelled) return;
      if (isFailure(res)) {
        setNameCheck(null); // unknown (throttled, offline...): the server decides on submit
        return;
      }
      setNameCheck({ key: nameCheckKey, status: res.available ? "ok" : "taken", message: res.message });
    }, TEAM_NAME_CHECK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nameCheckable, nameCheckKey, teamNameClean, captainIdForCheck]);

  // Only trust a result that belongs to the current name + captain.
  const liveCheck = nameCheck && nameCheck.key === nameCheckKey ? nameCheck : null;
  const nameTaken = liveCheck?.status === "taken" ? liveCheck.message || NAME_TAKEN_FALLBACK : undefined;
  const teamNameError = teamNameFormatErr ?? nameTaken;

  const gameError = hasGames && !game ? "Choose exactly one game." : undefined;
  const sizeError =
    isTeam && (!hasGames || game) && (memberCount < bounds.min || memberCount > bounds.max)
      ? bounds.min === bounds.max
        ? `This team needs exactly ${bounds.min} players including you.`
        : `Team size must be between ${bounds.min} and ${bounds.max} players including you.`
      : undefined;
  const membersValid = memberErrors.every((e) => Object.keys(e).length === 0);
  const utrValid = /^\d{12}$/.test(utr);

  const stepValid = (s: StepId): boolean => {
    switch (s) {
      case 1:
        return !!selectedEvent && selectedEvent.open;
      case 2:
        return Object.keys(captainErrors).length === 0;
      case 3:
        return !teamNameError && !gameError && !sizeError && membersValid && !pendingGame;
      case 4:
        return utrValid && !!shot;
      case 5:
        return consent;
    }
  };

  const allValid =
    !!selectedEvent &&
    selectedEvent.open &&
    stepValid(2) &&
    (!isTeam || stepValid(3)) &&
    (!needsPay || stepValid(4)) &&
    consent;

  // ----- navigation -----
  const goNext = () => {
    setAttempted((a) => ({ ...a, [step]: true }));
    if (!stepValid(step)) {
      setTimeout(() => {
        const bad = cardRef.current?.querySelector<HTMLElement>(".border-red-500\\/50");
        bad?.scrollIntoView({ behavior: "smooth", block: "center" });
        bad?.focus?.();
      }, 0);
      return;
    }
    const next = steps[steps.indexOf(step) + 1];
    if (next) {
      setStep(next);
      scrollToCard();
    }
  };

  const goBack = () => {
    const prev = steps[steps.indexOf(step) - 1];
    if (prev) {
      setStep(prev);
      scrollToCard();
    }
  };

  // ----- submit -----
  const handleSubmit = async () => {
    if (!selectedEvent || loading) return;
    if (!allValid) {
      setAttempted((a) => ({ ...a, 5: true }));
      return;
    }
    setLoading(true);
    setSlow(false);
    setSubmitError(null);

    const payload: RegisterPayload = {
      idempotencyKey: keyRef.current,
      eventId: selectedEvent.eventId,
      captain: toApiPerson(captain),
      consent: true,
    };
    if (isTeam) {
      payload.members = members.map(toApiPerson);
      if (teamNameClean) payload.teamName = teamNameClean;
      if (hasGames) payload.game = game;
    }
    if (needsPay && shot) {
      payload.payment = { utr, screenshot: { type: shot.file.type, base64: shot.preview } };
    }

    const res = await apiService.register(payload, { onSlow: () => setSlow(true) });
    setLoading(false);
    setSlow(false);

    if (res.success) {
      clearDraft();
      setSuccess(res);
      scrollToCard();
      return;
    }

    const list = res.errors?.map((e) => e.message) ?? [];
    setSubmitError({ message: res.message, list, retry: RETRYABLE.includes(res.error) });
    if (res.error === "EVENT_NOT_FOUND" || res.errors?.some((e) => e.code === "EVENT_CLOSED")) void loadEvents();

    // The server says the name is taken: remember it so Back/Next stays blocked until the name changes.
    const takenErr = res.errors?.find((e) => e.code === "TEAM_NAME_TAKEN");
    if (takenErr) setNameCheck({ key: nameCheckKey, status: "taken", message: takenErr.message });
  };

  const startAnother = () => {
    setSuccess(null);
    setEventId("");
    setStep(1);
    setTeamName("");
    setGame("");
    setMembers([]);
    setUtr("");
    setShot(null);
    setShotError("");
    setConsent(false);
    setPendingGame(null);
    setSubmitError(null);
    setTouched({});
    setAttempted({});
    setNameCheck(null);
    keyRef.current = newIdempotencyKey();
    scrollToCard();
  };

  const visibleFor = (s: StepId) => (key: string) => !!attempted[s] || !!touched[key];

  // -------------------------------------------------------------------------
  // Step views
  // -------------------------------------------------------------------------

  const stepHeading = (s: StepId) => (
    <h3 className="text-xl font-bold uppercase tracking-wider mb-8">
      Step {steps.indexOf(s) + 1}: {STEP_TITLES[s]}
    </h3>
  );

  const navButtons = (opts: { nextDisabled?: boolean } = {}) => (
    <div className="flex justify-between pt-8">
      <Button variant="outline" onClick={goBack}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Button variant="secondary" onClick={goNext} disabled={!!opts.nextDisabled}>
        Next <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderEventStep = () => (
    <div className="space-y-8">
      {stepHeading(1)}
      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 text-sm text-white/70 leading-relaxed">
        You can join <strong className="text-white">one event per slot</strong>, up to four events in total including
        TechSnap. Every team member counts toward the slot, not only the captain.
      </div>

      {events === null && !eventsError && <p className="text-white/50 text-sm">Loading events…</p>}

      {eventsError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{eventsError} Registration is unavailable until the events load.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadEvents()}>
            Retry
          </Button>
        </div>
      )}

      {events &&
        SLOT_GROUPS.map((g) => {
          const list = events.filter((e) => e.slot === g.slot);
          if (!list.length) return null;
          return (
            <div key={g.slot} className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">{g.title}</h4>
                <span className="text-xs text-white/40">{g.note}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((ev) => (
                  <button
                    type="button"
                    key={ev.eventId}
                    disabled={!ev.open}
                    onClick={() => chooseEvent(ev)}
                    className={cn(
                      "p-6 text-left border transition-all flex flex-col gap-2",
                      !ev.open && "opacity-50 cursor-not-allowed",
                      ev.open && eventId === ev.eventId
                        ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "bg-white/5 border-white/10",
                      ev.open && eventId !== ev.eventId && "hover:border-white/30",
                    )}
                  >
                    <span className="text-lg font-bold">{ev.name}</span>
                    <span className="text-xs text-white/40">
                      {teamLabel(ev)} · {ev.fee > 0 ? `₹${ev.fee} per team` : "FREE"}
                    </span>
                    {!ev.open && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                        Registration closed
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  const renderCaptainStep = () => (
    <div className="space-y-6">
      {stepHeading(2)}
      {selectedEvent && (
        <p className="text-sm text-white/60">
          Registering for <strong className="text-white">{selectedEvent.name}</strong>
          {isTeam ? ". You are the team captain." : "."}
        </p>
      )}
      <PersonFields
        prefix="captain"
        person={captain}
        errors={captainErrors}
        visible={visibleFor(2)}
        onChange={(f, v) => setCaptain((c) => updatePerson(c, f, v))}
        onTouch={touch}
      />
      {navButtons()}
    </div>
  );

  const renderTeamStep = () => {
    if (!selectedEvent) return null;
    const showMembers = !hasGames || !!game;
    const canAdd = showMembers && bounds.min !== bounds.max && memberCount < bounds.max;
    const canRemove = bounds.min !== bounds.max && memberCount > bounds.min;
    const visible = visibleFor(3);

    // A format error waits for touch/Next; a "taken" answer from the server shows straight away.
    const teamNameShownError = teamNameFormatErr ? (visible("teamName") ? teamNameFormatErr : undefined) : nameTaken;

    return (
      <div className="space-y-6">
        {stepHeading(3)}

        {hasGames && (
          <div className="space-y-2">
            <Select
              label="Game"
              name="game"
              value={game}
              onChange={(e) => requestGame(e.target.value)}
              options={[
                { label: "Select game", value: "" },
                ...selectedEvent.games.map((g) => ({
                  label: selectedEvent.gameSizes[g] ? `${g} (${selectedEvent.gameSizes[g]} players)` : g,
                  value: g,
                })),
              ]}
              error={attempted[3] ? gameError : undefined}
            />
            <p className="text-[10px] text-white/40 tracking-wide">
              Choose exactly one game. The team size depends on the game.
            </p>
          </div>
        )}

        {pendingGame && (
          <div className="p-5 bg-yellow-400/5 border border-yellow-400/30 space-y-4">
            <div className="flex gap-3 text-yellow-300 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                {pendingGame.game} allows fewer players than your team has. Select {pendingGame.need} member
                {pendingGame.need > 1 ? "s" : ""} to remove, then confirm. Nobody is removed until you confirm.
              </p>
            </div>
            <div className="space-y-2">
              {members.map((m, i) => (
                <label key={i} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingGame.remove.includes(i)}
                    onChange={() => togglePendingRemoval(i)}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span>{m.fullName.trim() || `Member ${i + 2}`}</span>
                  {m.collegeId && <span className="font-mono text-xs text-white/40">{normalizeCollegeId(m.collegeId)}</span>}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={confirmGameChange}
                disabled={pendingGame.remove.length !== pendingGame.need}
              >
                Remove selected and switch to {pendingGame.game}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPendingGame(null)}>
                Keep current game
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Input
            label={`Team Name${selectedEvent.teamMin === 1 && memberCount < 2 ? " (optional for a solo entry)" : ""}`}
            name="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onBlur={() => touch("teamName")}
            placeholder="Enter team name"
            maxLength={TEAM_NAME_MAX}
            autoComplete="off"
            error={teamNameShownError}
          />
          {liveCheck?.status === "checking" && !teamNameShownError && (
            <p className="text-[10px] text-white/40 tracking-wide">Checking availability…</p>
          )}
          {liveCheck?.status === "ok" && !teamNameShownError && (
            <p className="text-[10px] text-green-400 tracking-wide">Team name is available.</p>
          )}
          <p className="text-[10px] text-white/40 tracking-wide leading-relaxed">{TEAM_NAME_HINT}</p>
        </div>

        {showMembers && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Team members ({memberCount}
                {bounds.min === bounds.max ? ` of ${bounds.max}` : `, ${bounds.min} to ${bounds.max} allowed`})
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 text-sm">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 mr-3">Captain (you)</span>
              <span className="font-bold">{captain.fullName.trim() || "—"}</span>
              <span className="ml-3 font-mono text-xs text-white/40">{normalizeCollegeId(captain.collegeId)}</span>
            </div>

            {members.map((m, i) => (
              <div key={i} className="border border-white/10 bg-white/5 p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Member {i + 2}</p>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => removeMember(i)}
                      className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <PersonFields
                  prefix={`m${i}`}
                  person={m}
                  errors={memberErrors[i] ?? {}}
                  visible={visible}
                  onChange={(f, v) => updateMember(i, f, v)}
                  onTouch={touch}
                />
              </div>
            ))}

            {canAdd && (
              <Button variant="outline" onClick={addMember}>
                + Add member
              </Button>
            )}
            {attempted[3] && sizeError && <p className="text-[10px] text-red-500 uppercase tracking-tight">{sizeError}</p>}
          </div>
        )}

        {navButtons({ nextDisabled: !!pendingGame })}
      </div>
    );
  };

  const renderPaymentStep = () => {
    if (!selectedEvent) return null;
    const link = buildUpiLink(selectedEvent.fee);
    return (
      <div className="space-y-6">
        {stepHeading(4)}
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 md:p-8 flex flex-col items-center text-center">
          <p className="text-sm text-white/60 mb-2 uppercase tracking-widest">Entry fee for {selectedEvent.name}</p>
          <p className="text-5xl font-display font-bold text-white mb-2">₹{selectedEvent.fee}</p>
          <p className="text-xs text-white/40 mb-8">Per team, paid once.</p>

          <div className="w-full max-w-sm space-y-4 mb-8">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-inner flex flex-col items-center gap-4">
              <QRCodeCanvas
                value={link}
                size={220}
                level="H"
                includeMargin={true}
                style={{ maxWidth: "100%", height: "auto" }}
              />
              <a
                href={link}
                className="rounded-lg bg-cyan-500 px-6 py-3 font-bold text-white hover:bg-cyan-400 transition"
              >
                PAY ₹{selectedEvent.fee} USING UPI
              </a>
              <p className="text-sm text-gray-500 text-center">
                Scan the QR code with any UPI app, or tap the button on your phone.
              </p>
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <span className="text-[11px] font-mono font-bold text-slate-700 break-all">{UPI_ID}</span>
                <button
                  type="button"
                  onClick={() => void copyText(UPI_ID, setCopiedUpi)}
                  className="text-[10px] text-cyan-600 font-bold uppercase hover:text-cyan-700"
                >
                  {copiedUpi ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full text-left space-y-6">
            <div className="space-y-2">
              <Input
                label="UTR / UPI Reference Number (12 digits)"
                name="utr"
                inputMode="numeric"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                onBlur={() => touch("utr")}
                placeholder="e.g. 412345678901"
                maxLength={12}
                autoComplete="off"
                error={attempted[4] || touched["utr"] ? (utrValid ? undefined : "UTR must be exactly 12 digits.") : undefined}
              />
              <p className="text-[10px] text-white/40 tracking-wide leading-relaxed">
                Find it in your payment app under the transaction details, labelled &quot;UTR&quot;, &quot;UPI Ref No.&quot; or
                &quot;Transaction ID&quot;. It is 12 digits long.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                Upload Payment Screenshot (JPG or PNG, max 2 MB)
              </label>
              <div
                className={cn(
                  "relative min-h-[180px] border-2 border-dashed border-white/20 hover:border-cyan-500/50 transition-colors p-6 flex flex-col items-center justify-center",
                  (shotError || (attempted[4] && !shot)) && "border-red-500/50",
                )}
              >
                <input
                  type="file"
                  aria-label="Payment screenshot"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => void onShotChange(e)}
                  accept="image/png,image/jpeg"
                />
                {shot ? (
                  <div className="relative w-full aspect-video bg-black/40">
                    <img src={shot.preview} alt="Payment screenshot preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      aria-label="Remove screenshot"
                      onClick={() => setShot(null)}
                      className="absolute top-2 right-2 z-10 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-white/20" />
                    <p className="text-sm text-white/40">Click or drag a screenshot here</p>
                  </div>
                )}
              </div>
              {shotError && <p className="text-[10px] text-red-500 uppercase tracking-tight">{shotError}</p>}
              {!shotError && attempted[4] && !shot && (
                <p className="text-[10px] text-red-500 uppercase tracking-tight">Payment screenshot is required.</p>
              )}
            </div>
          </div>
        </div>
        {navButtons()}
      </div>
    );
  };

  const renderReviewStep = () => {
    if (!selectedEvent) return null;
    const people = [captain, ...members];
    return (
      <div className="space-y-6">
        {stepHeading(5)}

        {!selectedEvent.open && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            Registration for {selectedEvent.name} has closed.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase text-white/40">Event</p>
            <p className="text-sm font-bold">{selectedEvent.name}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase text-white/40">{isTeam ? "Team" : "Entry"}</p>
            <p className="text-sm font-bold">{isTeam ? teamNameClean || "Solo entry" : "Solo"}</p>
          </div>
          {hasGames && (
            <div className="p-4 bg-white/5 border border-white/5">
              <p className="text-[10px] uppercase text-white/40">Game</p>
              <p className="text-sm font-bold">{game}</p>
            </div>
          )}
          {needsPay && (
            <div className="p-4 bg-white/5 border border-white/5">
              <p className="text-[10px] uppercase text-white/40">Payment</p>
              <p className="text-sm font-bold">
                ₹{selectedEvent.fee} · UTR <span className="font-mono">{utr}</span>
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 border border-white/5 space-y-3">
          <p className="text-[10px] uppercase text-white/40">{isTeam ? `Players (${people.length})` : "Participant"}</p>
          {people.map((p, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <span className="font-bold">
                {p.fullName.trim()}
                {i === 0 && isTeam && <span className="ml-2 text-[10px] text-cyan-400 uppercase">Captain</span>}
              </span>
              <span className="font-mono text-xs text-white/50">
                {normalizeCollegeId(p.collegeId)} · {p.branch} · {p.year}
              </span>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 text-xs text-white/70 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
          />
          <span>
            I confirm that {isTeam ? "all the members listed above have" : "I have"} agreed to share their details (name,
            College ID, email and phone) with the TechSpardha organizers, and that I accept the event rules. College ID
            cards are checked at entry.
          </span>
        </label>
        {attempted[5] && !consent && (
          <p className="text-[10px] text-red-500 uppercase tracking-tight">Please confirm to continue.</p>
        )}

        {!allValid && selectedEvent.open && (
          <p className="text-xs text-yellow-400/80">
            Some details are incomplete. Use Back to check each step before submitting.
          </p>
        )}

        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="space-y-2">
              {submitError.list.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {submitError.list.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p>{submitError.message}</p>
              )}
              {submitError.list.length > 0 && <p className="text-xs text-red-300/80">Use Back to correct the details above. Nothing was saved.</p>}
            </div>
          </div>
        )}

        {loading && slow && (
          <p className="text-xs text-yellow-400/80">
            This is taking longer than usual. Please wait and do not re-enter your details or refresh the page.
          </p>
        )}

        <div className="flex justify-between pt-4 gap-4">
          <Button variant="outline" onClick={goBack} disabled={loading}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => void handleSubmit()}
            isLoading={loading}
            disabled={loading || !allValid}
          >
            {submitError?.retry ? "Retry" : "Confirm Registration"}
          </Button>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Printable confirmation slip.
  // It is rendered through a portal straight into <body> (outside #root) so the print
  // stylesheet can hide the entire website with `body > *:not(#printable-slip)` and the
  // slip starts at the top of page 1. On screen it is display:none (see index.css).
  // -------------------------------------------------------------------------

  const renderPrintableSlip = (s: RegisterSuccess) => {
    const pending = s.paymentStatus === "pending_verification";
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const th = "border border-neutral-400 p-2 text-left font-semibold";
    const td = "border border-neutral-300 p-2 align-top";

    return (
      <div id="printable-slip" className="bg-white text-black font-sans text-left">
        {/* Header: official branding */}
        <div className="slip-block flex justify-between items-start gap-6 border-b-2 border-black pb-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-600 font-semibold">
              IMS Engineering College, Ghaziabad
            </p>
            <h1 className="text-3xl font-bold uppercase tracking-tight mt-1 text-black">TECHSPARDHA 2K26</h1>
            <p className="text-xs text-neutral-600 mt-1">
              Organized by GENESIS Technical Society · 23–24 October 2026
            </p>
            <p className="text-xs font-bold uppercase tracking-widest mt-3 text-black">Registration Confirmation Slip</p>
          </div>

          {/* Registration box */}
          <div className="border-2 border-black p-3 min-w-[190px] text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Registration ID</p>
            <p className="text-2xl font-mono font-bold text-black tracking-wider">{s.regId}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mt-2">Date</p>
            <p className="text-xs font-semibold text-black">{today}</p>
            <span
              className={cn(
                "inline-block text-[10px] uppercase font-bold px-2 py-0.5 mt-2 border border-black",
                pending ? "bg-white text-black" : "bg-black text-white",
              )}
            >
              {pending ? "Pending Verification" : "Confirmed"}
            </span>
          </div>
        </div>

        {/* Event summary */}
        <div className="slip-block mb-5">
          <h2 className="text-xs uppercase tracking-wider font-bold bg-neutral-100 p-2 border-l-4 border-black mb-3">
            Event Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs border border-neutral-300 p-3">
            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Event Name</span>
              <span className="font-bold text-sm text-black">{s.eventName}</span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Format / Team Name</span>
              <span className="font-bold text-sm text-black">{s.teamName || (isTeam ? "Team" : "Solo")}</span>
            </div>
            {s.game && (
              <div>
                <span className="text-neutral-500 block uppercase text-[10px]">Game</span>
                <span className="font-bold text-sm text-black">{s.game}</span>
              </div>
            )}
            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Total Participants</span>
              <span className="font-bold text-sm text-black">{s.teamSize}</span>
            </div>
          </div>
        </div>

        {/* Captain / participant */}
        <div className="slip-block mb-5">
          <h2 className="text-xs uppercase tracking-wider font-bold bg-neutral-100 p-2 border-l-4 border-black mb-3">
            {isTeam ? "Team Captain Details" : "Participant Details"}
          </h2>
          <table className="w-full text-xs border-collapse border border-neutral-400">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800">
                <th className={th}>Full Name</th>
                <th className={th}>College ID</th>
                <th className={th}>Branch</th>
                <th className={th}>Year</th>
                <th className={th}>Phone</th>
                <th className={th}>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cn(td, "font-bold")}>{captain.fullName}</td>
                <td className={cn(td, "font-mono")}>{normalizeCollegeId(captain.collegeId)}</td>
                <td className={td}>{captain.branch}</td>
                <td className={td}>{captain.year}</td>
                <td className={td}>{captain.phone}</td>
                <td className={cn(td, "break-all")}>{captain.email}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Team members */}
        {isTeam && members.length > 0 && (
          <div className="mb-5">
            <h2 className="slip-block text-xs uppercase tracking-wider font-bold bg-neutral-100 p-2 border-l-4 border-black mb-3">
              Team Members ({members.length})
            </h2>
            <table className="w-full text-xs border-collapse border border-neutral-400">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800">
                  <th className={th}>#</th>
                  <th className={th}>Name</th>
                  <th className={th}>College ID</th>
                  <th className={th}>Branch</th>
                  <th className={th}>Year</th>
                  <th className={th}>Mobile</th>
                  <th className={th}>Email</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr key={idx}>
                    <td className={cn(td, "text-neutral-500")}>{idx + 2}</td>
                    <td className={cn(td, "font-medium")}>{m.fullName}</td>
                    <td className={cn(td, "font-mono")}>{normalizeCollegeId(m.collegeId)}</td>
                    <td className={td}>{m.branch}</td>
                    <td className={td}>{m.year}</td>
                    <td className={td}>{m.phone}</td>
                    <td className={cn(td, "break-all")}>{m.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Instructions */}
        <div className="slip-block mt-6 border-t border-neutral-300 pt-4 text-[11px] text-neutral-700 space-y-1">
          <p className="font-bold uppercase text-black">Important Instructions</p>
          {pending && (
            <p>0. Your registration is confirmed only after the organizers verify your payment.</p>
          )}
          <p>1. Every participant must carry their original College ID card. Details are verified at entry.</p>
          <p>2. Please report to the venue at least 30 minutes before the announced slot time.</p>
          <p>3. Keep this Registration ID safe for attendance and prize distribution.</p>
          <p className="text-[10px] text-neutral-500 pt-2">Generated on {today} · TECHSPARDHA 2K26 Official Portal</p>
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    if (!success) return null;
    const pending = success.paymentStatus === "pending_verification";
    return (
      <>
        {/* On-screen confirmation card (dark theme, unchanged) */}
        <div className="text-center py-8 space-y-8">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-3xl font-display font-bold uppercase">Registration Received</h3>
            <p className="text-xs text-white/50 uppercase tracking-widest">Your registration ID</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl md:text-5xl font-mono font-bold text-cyan-400 tracking-wider">{success.regId}</span>
              <button
                type="button"
                aria-label="Copy registration ID"
                onClick={() => void copyText(success.regId, setCopiedReg)}
                className="p-2 border border-white/20 hover:bg-white/5"
              >
                {copiedReg ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto p-6 md:p-8 bg-white/5 border border-white/10 space-y-4 text-left">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-xs text-white/40 uppercase">Event</span>
              <span className="text-sm font-bold text-right">{success.eventName}</span>
            </div>
            {success.teamName && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-xs text-white/40 uppercase">Team</span>
                <span className="text-sm font-bold text-right">{success.teamName}</span>
              </div>
            )}
            {success.game && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-xs text-white/40 uppercase">Game</span>
                <span className="text-sm font-bold text-right">{success.game}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-xs text-white/40 uppercase">Players</span>
              <span className="text-sm font-bold">{success.teamSize}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-white/40 uppercase">Status</span>
              <span
                className={cn(
                  "text-xs font-bold uppercase px-2 py-0.5",
                  pending ? "text-yellow-400 bg-yellow-400/10" : "text-green-400 bg-green-400/10",
                )}
              >
                {pending ? "Pending verification" : "Confirmed"}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
            {pending
              ? "Your registration is confirmed only after the organizers verify your payment. "
              : ""}
            Keep your registration ID safe and carry your college ID card. Cards are checked at entry.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" onClick={() => window.print()}>
              Download Confirmation
            </Button>
            <Button variant="outline" onClick={startAnother}>
              Register for another event
            </Button>
          </div>
        </div>

        {/* Print-only slip, mounted on <body> so nothing else on the site can leak into the PDF */}
        {typeof document !== "undefined" && createPortal(renderPrintableSlip(success), document.body)}
      </>
    );
  };

  const renderStep = () => {
    if (success) return renderSuccess();
    switch (step) {
      case 1:
        return renderEventStep();
      case 2:
        return renderCaptainStep();
      case 3:
        return renderTeamStep();
      case 4:
        return renderPaymentStep();
      case 5:
        return renderReviewStep();
    }
  };

  return (
    <section id="registration" className="section-padding bg-black relative">
      <div className="container-width">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Join the <span className="text-cyan-500">Battle</span>
            </h2>
            <p className="text-white/60 max-w-xl mx-auto uppercase tracking-widest text-sm">
              Secure your spot in TechSpardha 2K26. Follow the steps below.
            </p>
            <p className="mt-4 text-sm font-semibold text-red-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <span>⚠</span> Last date to register: 17 October
            </p>
          </div>

          {notice && (
            <div
              role="status"
              className="mb-6 flex items-start justify-between gap-4 p-4 bg-yellow-400/5 border border-yellow-400/30 text-sm text-yellow-300"
            >
              <p>{notice}</p>
              <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div ref={cardRef} className="bg-neutral-900 border border-white/10 p-5 sm:p-8 md:p-12 relative scroll-mt-24">
            {!success && (
              <div className="flex items-center gap-4 mb-12">
                {steps.map((s) => (
                  <div
                    key={s}
                    className={cn("flex-1 h-1 transition-all duration-500", step >= s ? "bg-cyan-500" : "bg-white/10")}
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={success ? "success" : step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};