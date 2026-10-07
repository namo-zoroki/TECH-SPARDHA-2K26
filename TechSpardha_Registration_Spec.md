# TechSpardha 2K26 — Registration System Specification

**Version:** 1.0 | **Audience:** implementing agent (Antigravity) | **Format:** rules only, no code

**Conventions.** MUST / MUST NOT are mandatory. SHOULD is the default unless there is a concrete reason not to. Rules tagged *(default)* were proposed during design and not explicitly confirmed; they are collected in Chapter 17. Where this spec and the existing code disagree, **this spec wins**. Do not add features that are not listed here.

---

## 1. Scope and architecture

1.1 **Context.** An in-house fest for one college only. Expected volume is small (hundreds of students). No other college participates, so there is no College field anywhere in the system.

1.2 **Stack is fixed.** Existing React single-page app → Google Apps Script web app (the only backend) → Google Sheets (database) and Google Drive (payment screenshots). No Firebase, no Node server, no new database.

1.3 **Cleanup.** Remove the unused dependencies `express`, `@google/genai`, `dotenv`. Remove the committed `dist/` folder from version control and add it to `.gitignore`.

1.4 **Implementation targets in the existing project.** Registration form component, API service, admin dashboard component, info sections (rules, schedule, contact, footer), hero component, event data file, the Apps Script backend file, plus a new one-time setup function in the backend.

1.5 **Existing data.** Rows currently in the sheets are test data. Rebuild every tab from Chapter 5. No migration.

1.6 **Timezone.** Set the script and spreadsheet timezone to IST (Asia/Kolkata). All timestamps use it.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| College ID | The unique ID issued by the college, e.g. `A2024IT11357`. The only student identifier. |
| Slot | A group of events a student may take only one of. Values: `1`, `2`, `3`, `TS`. |
| Registration | One entry (solo or team) in one event. Identified by a RegID. |
| RegID | Registration identifier, format `TS-0001`. Shared by every member of that team for that event. |
| Captain | The member who submits the registration; exactly one per registration. |
| Member | Any student on the team, captain included. |
| Active | A member row or registration that has not been cancelled, removed, or swapped out. |

---

## 3. Events and slots

### 3.1 Event line-up

| Slot | Events |
|---|---|
| 1 | CodeDecode 2.0, RoboRace 2.0, Ideathon |
| 2 | AI Build Arena, UI/UX Blitz, Gamer Fiesta 2.0 |
| 3 | Cyber Hunt, Tech Wars, CEO Quest, Tech Treasure Hunt (all four run at the same time) |
| TS | TechSnap (independent; runs on both days outside the slots; video recording and editing) |

That is 11 events in total.

### 3.2 Slot rules

3.2.1 A student MUST hold at most one active registration per slot. Maximum is 4 events: one each in Slots 1, 2, 3, plus TechSnap.
3.2.2 The rule applies to **every member of a team**, not only the captain. A student listed as a member of a Slot 2 team has used their Slot 2.
3.2.3 Registering for the same event twice is therefore impossible; no separate duplicate check is needed.
3.2.4 A student MAY be on different teams in different slots. The same group of students MAY register for several events as separate registrations (separate RegIDs, team names may differ). There is no persistent "team" entity across events.
3.2.5 Slot 3's rule is correct as stated because all four events run simultaneously.

### 3.3 Source of truth for event data

3.3.1 The **Events sheet** is the single source for operational fields: Slot, TeamMin, TeamMax, Games, Fee, Open.
3.3.2 The event data file in the frontend holds **display content only** (descriptions, images, categories, rules text), keyed by EventID. Existing EventIDs MUST be kept (Gamer Fiesta is currently `08`); do not renumber.
3.3.3 The frontend MUST load operational fields from the backend (a public read-only "get events" action) when the page loads. If that call fails, registration MUST be disabled with a retry message. The server re-validates everything regardless.
3.3.4 Behavior MUST be data-driven; never hardcode event IDs in logic:
- Solo event: TeamMin = TeamMax = 1. Team event: otherwise.
- Payment step exists only when Fee > 0.
- Game selection exists only when Games is non-empty.

### 3.4 Gamer Fiesta 2.0

3.4.1 Slot 2. The only paid event: Fee is **per team** (₹200), not per player.
3.4.2 Contains three games: BGMI, Valorant, Free Fire. A team MUST choose **exactly one** game. This is a field on the registration, not three separate events.
3.4.3 A team cannot enter two games; the slot rule already blocks a second Gamer Fiesta registration.
3.4.4 Everything else about Gamer Fiesta is flexible and driven by the Events sheet (team size limits, allowed games list).

### 3.5 TechSnap

3.5.1 Registers like any other event under slot `TS` (own column in Participants). It does not conflict with Slots 1–3.
3.5.2 Its format (solo/team) comes from the Events row. Its submission mechanism (how videos are delivered) is **undecided**; do not build any submission upload. Keep the code generic so it can be added later.

---

## 4. Student identity

4.1 **College ID format.** `A` + 4-digit year + 2 to 7 letters + 4 to 5 digits. As a single pattern: `^A\d{4}[A-Z]{2,7}\d{4,5}$`. The trailing digit part is 4 to 5 digits, not fixed.

4.2 **Normalization.** Trim whitespace, convert to uppercase. Never pad, strip, or otherwise reformat digits. Store and compare as plain text.

4.3 **The College ID is the only identity key.** Email and phone are contact data, not identifiers. Do not strip email `+alias` parts.

4.4 **Branch codes (dropdown values, stored exactly as written):** `ASH`, `CSE`, `CS`, `IT`, `CSEAIML`, `BT`, `ME`, `ECE`, `MBA`, `MCA`.
- `ASH` is a batch code for all first-year students, not a real branch.
- The letters in the ID sit between the 4-digit year and the final digits, so they can be read unambiguously.

4.5 **Year dropdown.** Current year of study, entered by the student: 1st, 2nd, 3rd, 4th. The year inside the ID is the admission year and MUST NOT be used as year of study.
- If Branch = `ASH`, Year MUST be 1st (auto-set and lock).
- If Branch is `MBA` or `MCA`, offer only 1st and 2nd *(default)*.
- Do not force every 1st-year student to ASH.

4.6 **Pre-fill.** When a syntactically valid ID is typed, pre-select the Branch from the ID's letters if they match a branch code. The student can change it.

4.7 **Mismatch handling.** If the ID's branch letters do not match the chosen Branch (or are not in the list), the server MUST accept the registration and add the flag `BRANCH_MISMATCH` to that Participants row for admin review. Never reject for this reason *(default)*.

4.8 **IDs are not secret and are not verified.** Do not treat an ID as authentication. Organizers check college ID cards at entry; state this in the Rules section.

---

## 5. Data model (Google Sheets)

### 5.1 General rules

5.1.1 Every field has its **own column**. Never combine several fields in one cell. The only multi-value cells are two configuration or note cells: `Events.Games` (a comma-separated list of allowed game names) and `Participants.Flags` (human-readable notes).
5.1.2 One header row per sheet, using exactly the column names below. Store IDs, UTRs, phones, and College IDs as **plain text**.
5.1.3 A one-time, **idempotent setup function** MUST create all tabs, headers, dropdown validation on enumerated columns, and protection on formula tabs. Re-running it MUST NOT destroy data.
5.1.4 Organizers MUST NOT hand-edit Registrations, Team_Members, Payments, or the Slot columns of Participants. All changes go through admin actions (Chapter 10).
5.1.5 A manual maintenance function SHOULD exist that rebuilds the Slot columns in Participants from Registrations and Team_Members (the slot ledger is derived data and must be recoverable).
5.1.6 IDs: RegID is `TS-` + zero-padded counter (`TS-0001`); PaymentID is `PAY-` + zero-padded counter. Counters live in Script Properties, are incremented only inside the lock, and are never reused (gaps are fine). Do not use row numbers as IDs.
5.1.7 A **daily time-driven backup** of the whole spreadsheet SHOULD run, keeping the last 7 copies *(default)*.

### 5.2 Events (11 rows)

| Column | Rule |
|---|---|
| EventID | Key; matches the frontend event data file |
| Name | Display name |
| Slot | `1`, `2`, `3`, or `TS` |
| TeamMin | Minimum team size (1 for solo) |
| TeamMax | Maximum team size (1 for solo) |
| Games | Allowed game names, comma-separated; only Gamer Fiesta has a value |
| Fee | Per team in ₹; `0` for free events |
| Open | TRUE/FALSE; registration switch for this event only |
| TotalReg | Formula: count of Registrations for this EventID whose Status is not `cancelled` |

No capacity or seats-left columns *(confirmed: crowd is small)*. The registration logic MUST NOT contain a capacity check.

### 5.3 Registrations (one row per solo or team entry)

| Column | Rule |
|---|---|
| RegID | Generated by the script |
| Timestamp | Submission time |
| EventID | Links to Events |
| TeamName | Blank for solo events |
| Game | Gamer Fiesta only |
| CaptainID | College ID of the captain |
| TeamSize | Count of active members, maintained by the script |
| Status | `pending_verification`, `confirmed`, or `cancelled` |
| UpdatedAt | Last change time |

Status rules: free events are `confirmed` immediately. Paid events start `pending_verification` (payment is submitted with the registration and awaits admin verification), become `confirmed` when the payment is verified, and `cancelled` on cancellation or payment rejection.

### 5.4 Team_Members (one row per member, captain included)

| Column | Rule |
|---|---|
| RegID | Links to Registrations |
| CollegeID | Links to Participants |
| Role | `captain` or `member` |
| Active | TRUE/FALSE. A swap or removal sets the old row FALSE; history is kept |

Solo registrations have exactly one row (the captain), so slot logic is identical for solo and team events.

### 5.5 Participants (one row per student, keyed by CollegeID)

| Column | Rule |
|---|---|
| CollegeID | Key, normalized, unique |
| FullName | Required |
| Email | Required |
| Phone | Required |
| Year | From dropdown |
| Branch | From dropdown |
| Slot1 | RegID of the active registration holding this slot, or blank |
| Slot2 | Same |
| Slot3 | Same |
| TechSnap | Same |
| Flags | Notes for admin, e.g. `BRANCH_MISMATCH`, `CONTACT_DIFFERS` |
| CreatedAt | When the row was first created |

Contact details are stored **once per student**, never per registration. Slot cells hold the RegID (the event is derivable from it).

### 5.6 Payments (Gamer Fiesta only)

| Column | Rule |
|---|---|
| PaymentID | Generated by the script |
| RegID | Links to Registrations |
| UTR | 12 digits, plain text |
| Amount | Copied from Events.Fee by the server; never from the client |
| Status | `pending`, `verified`, or `rejected` |
| ScreenshotURL | Link to the private Drive file |
| SubmittedAt | Submission time |
| VerifiedBy | Admin name entered at login |
| VerifiedAt | Time of verify or reject |
| Note | Admin note |

Only Gamer Fiesta registrations create a Payments row.

### 5.7 Admin_Log (append-only)

Columns: `Timestamp`, `Actor`, `Action`, `RegID`, `Detail`.
Actions logged: REGISTER, VERIFY_PAYMENT, REJECT_PAYMENT, CANCEL, SWAP_MEMBER, REMOVE_MEMBER, CHANGE_CAPTAIN, EDIT_PARTICIPANT, LOGIN_OK, LOCKOUT.

### 5.8 Contacts (read-only formula view)

One row per **active member of a non-cancelled registration**. Columns: `RegID`, `Event`, `Team`, `Role`, `Name`, `CollegeID`, `Email`, `Phone`. It is built from the other sheets by formulas, is protected, and MUST NOT be written to by the script. Purpose: easy contacting of teams. A dropdown-driven per-event view and a captains-only filter are optional extras.

---

## 6. Registration flow (frontend)

6.1 **One submission registers one event.** A student returns to register for further events. The form does not look up a student's existing slots (see 6.9), so slot conflicts are reported by the server on submit.

6.2 **Steps** (non-applicable steps are skipped automatically):
1. Choose event.
2. Your details (captain).
3. Team details (team events only).
4. Payment (events with Fee > 0 only).
5. Review and submit.
6. Success screen.

6.3 **Step 1.** Events MUST be grouped by slot (four groups: Slot 1, Slot 2, Slot 3, TechSnap), not shown as one flat list. Show a short explanation at the top: a student can join one event per slot, up to four in total including TechSnap. Events with Open = FALSE are shown disabled with the label "Registration closed".

6.4 **Step 2.** Captain enters: full name, college ID, email, phone, year, branch. (Branch pre-fill and ASH lock per 4.5 and 4.6.)

6.5 **Step 3.** Team events only.
- Team name (required).
- Game (Gamer Fiesta only; required; exactly one of the allowed games).
- A dynamic member list with add and remove. Every member, **without exception**, requires: full name, college ID, email, phone, year, branch.
- The captain counts toward TeamMin and TeamMax and is shown as the first row; the captain's details are not re-entered.
- Add/remove controls enforce TeamMin and TeamMax. Show duplicate-ID errors inline.

6.6 **Step 4 (paid events).**
- Show the amount (from the backend Fee), a QR code and a UPI deep link. The UPI ID MUST live in a single named configuration constant, not repeated in code.
- **Both** the 12-digit UTR field and the payment screenshot upload are required.
- Show a hint for where to find the UTR in the payment app.
- Screenshot: JPG or PNG only, max 2 MB, with preview. If the file is HEIC or another type, show a message asking for a JPG or PNG screenshot.

6.7 **Step 5.** Show a full summary. Include a required checkbox where the captain confirms that all listed members agreed to share their details with the organizers. Submit is disabled while a request is in flight.

6.8 **Success screen.** Show the RegID prominently with a copy button, the event, the team, and for paid events the status "Pending verification". Clear the saved draft.

6.9 **No public lookups.** The backend MUST NOT expose any public action that returns participant data or slot occupancy for a given ID. Conflict errors name only the conflicting college IDs and the slot, never the other team, event, or contact details.

6.10 **Resilience.**
- Save the in-progress form to session storage so a refresh does not lose it (never persist the screenshot); clear it on success.
- Each submit attempt carries a client-generated **idempotency key**; a retry after a timeout or network failure reuses the same key.
- Allow up to about 45 seconds before showing "taking longer than usual; do not re-enter, press Retry". Retry reuses the key.
- Show inline per-field errors; block "Next" until the step is valid.

---

## 7. Field validation (identical on frontend and server)

The server is the authority and MUST re-validate every rule. All string input is trimmed.

| Field | Rule |
|---|---|
| College ID | Pattern in 4.1 after normalization |
| Full name | Required, 2 to 80 characters, no control characters *(default)* |
| Email | Valid format, lowercased |
| Phone | Remove spaces, a leading `+91`, or a leading `0`; the remainder MUST be 10 digits starting with 6, 7, 8, or 9 *(default)* |
| Year, Branch | Must be one of the dropdown values, plus the rules in 4.5 |
| Team name | Required for team events, 2 to 40 characters; unique within the same event, case-insensitive *(default)* |
| Game | Required for Gamer Fiesta; one of Events.Games |
| UTR | Exactly 12 digits, stored as text |
| Screenshot | JPG or PNG; 2 MB limit on the client; server rejects any payload above about 3 MB and verifies type |
| All text | Cap lengths; strip control characters; reject unknown fields; neutralize spreadsheet formula injection by prefixing any value that starts with `=`, `+`, `-`, or `@` with an apostrophe (also in CSV exports) |

---

## 8. Server rules for a registration submission

All steps run inside **one script lock**, waiting up to 30 seconds; if the lock is not acquired, return a "busy, please retry" response.

8.1 **Pre-checks (before the lock).** Honeypot field empty. Throttle: at most 5 submissions per captain ID and per email in 10 minutes *(default)*. Payload size cap.

8.2 **Idempotency.** If the idempotency key was already processed, return the original result (same RegID) and write nothing. Keys are remembered for several hours.

8.3 **Order of checks** (collect all conflicts and return them together, do not stop at the first):
1. Event exists and Open = TRUE.
2. Payload shape and all field validations (Chapter 7).
3. Team size within TeamMin..TeamMax; Game valid when required.
4. Inside the team: no College ID listed twice; captain is exactly one member and counted once.
5. For **every** member ID: the slot of this event is not already held by an active registration. If any member conflicts, reject the **whole** registration and name every conflicting ID and the slot.
6. Paid events: the UTR is not already used by any Payments row with Status `pending` or `verified`. (Rejected UTRs may be reused so a team re-registering after a rejection can use the same valid UTR.) Amount is taken from Events.Fee.

8.4 **Writes (only after every check passes), all-or-nothing:**
1. Generate RegID (and PaymentID).
2. Upload the screenshot to the private Drive folder (named by RegID).
3. Create or update Participants rows; set each member's slot cell to the RegID.
4. Append the Registrations row, one Team_Members row per member, and the Payments row if paid.
5. Append an Admin_Log entry.

If any step fails, undo what was written (including trashing an uploaded file) so no partial registration remains. Never leave a half-written team.

8.5 **Participant data handling.**
- New student: create the row from the submitted details.
- Existing student: **never overwrite** FullName, Email, Phone, Year, or Branch from a later registration. If the submitted contact details differ, add the flag `CONTACT_DIFFERS` for admin review. Admins can edit participant details later (10.7).

8.6 **Response.** Return RegID and status. Server errors return a generic message; no internal details.

---

## 9. Payments (Gamer Fiesta)

9.1 Fee is per team, fixed by the Events sheet. The client's amount is never trusted.
9.2 A team's payment is one UTR plus one screenshot, submitted in the same request as the registration.
9.3 Screenshots live in a **private** Drive folder (folder ID kept in Script Properties). Files MUST NOT be shared by public link. The admin panel shows the image through an authenticated backend action.
9.4 Verification (admin): Payment Status → `verified`, Registration Status → `confirmed`, record VerifiedBy and VerifiedAt.
9.5 Rejection (admin): Payment Status → `rejected`, the registration is **cancelled** and every member's slot is freed. The team re-registers from scratch *(default)*. The rejected UTR no longer blocks reuse.
9.6 Refunds are handled outside the system. Cancelling a verified registration keeps the Payments row as `verified` and adds a Note.
9.7 The admin checks the UTR, amount, and screenshot together against the actual bank/UPI statement. A typed UTR proves nothing by itself; the system only catches reuse.

---

## 10. Admin actions

All actions require an authenticated admin session, run inside the lock, update every affected sheet together, and write an Admin_Log entry.

10.1 **Verify payment** (9.4).
10.2 **Reject payment** (9.5).
10.3 **Cancel registration.** Status → `cancelled`; all member rows → Active FALSE; clear each member's slot cell if it still holds that RegID. This frees all members' slots in one operation. The UTR stays on record.
10.4 **Swap member.** Replace member X with Y in a registration. The new student Y MUST provide the full details (6.5) and pass the same slot check as a new registration. X's row → Active FALSE and X's slot cell is cleared; Y gets a new row and Y's slot cell is set. Team size limits still apply afterward.
10.5 **Remove member without replacement.** Allowed only if the active size stays at or above TeamMin; otherwise refuse.
10.6 **Change captain.** Assign the captain role to another active member and update CaptainID. If the captain is removed or swapped, a new captain MUST be assigned in the same action.
10.7 **Edit participant details** (typo fixes). Allowed, logged.
10.8 **Close or open an event.** Done by editing the Open cell in Events. It affects only new registrations; existing ones are untouched.

---

## 11. Admin panel and authentication

11.1 **Route.** The admin panel is reached only by the `#admin` hash route. Remove the "Admin Login" link from the footer.

11.2 **Login.** Admin enters a **name and a password**. The name is recorded as the actor for audits.

11.3 **Secrets.** The password lives only in Script Properties, never in source. The old password is compromised and MUST be replaced.

11.4 **Sessions.** Successful login returns a random session token held server-side with an expiry of about 2 hours. Every admin action requires a valid token. Do not send the password with each request.

11.5 **Lockout.** After 5 consecutive failed logins, lock admin login for 15 minutes *(default)*. (The lockout is global because client IPs are unavailable; the Sheets themselves remain accessible to the owner.)

11.6 **Dashboard features.**
- Stats: total registrations, per-event totals, unique participants, Gamer Fiesta pending verification, verified, rejected, cancelled.
- Search by RegID, college ID, name, or team; filter by event and status.
- Registration detail: all members with contact details, and for paid events the UTR, amount, and screenshot.
- Actions from Chapter 10.
- CSV export (registrations; contacts), with formula-injection neutralization (Chapter 7). A "copy emails" helper (all, or captains only) filtered by event.
- Refresh button.

---

## 12. Organizer access and privacy

12.1 The Spreadsheet is shared view-only and only with the core team. Sheets cannot restrict rows per coordinator; if per-event access is required later, produce per-event exports instead.
12.2 Phone numbers and emails of all members are stored. Collect them only on the form (with the consent checkbox in 6.7) and expose them only through the admin panel and the Spreadsheet.
12.3 The public backend exposes exactly two actions: "get events" and "submit registration", plus a minimal health check that reveals nothing.

---

## 13. Security and configuration

13.1 `.env` MUST be in `.gitignore` and removed from history. The backend URL is a public value (frontend build variables are embedded in the bundle), so protection comes from server-side rules, not from hiding the URL.
13.2 After the backend is hardened, **deploy a new Apps Script web app version and URL** and retire the old one.
13.3 Script Properties hold: admin password, Drive folder ID, RegID counter, PaymentID counter.
13.4 Fee, slot, team limits, and games always come from the Events sheet. Nothing about event rules is hardcoded in the backend or the frontend.
13.5 No frontend-only enforcement: every rule in Chapters 3, 4, 7, 8 is enforced on the server.
13.6 Registration is gated only by each event's Open flag. There is no date-based gating.

---

## 14. Existing-site fixes to include

14.1 Hero background image path points to a development-only location and fails in production builds; use a proper asset import or the public folder.
14.2 UPI ID repeated several times in the form; replace with one constant.
14.3 Footer "Event Brochure" and "Rulebook PDF" links are dead; hide them until the files exist.
14.4 Responsive polish: countdown boxes on very small screens, the decorative oversized background text causing horizontal overflow in the Gamer Fiesta section, and the screenshot drop zone needing a minimum height.
14.5 Rules section MUST explain the slot system, the 4-event maximum, and that ID cards are checked at entry.
14.6 The Schedule section stays a placeholder until times are final; when filled, Slot 3's four events appear in one time block.
14.7 Remove the unused `gender` and `city` fields from the registration data type.

---

## 15. Edge-case catalogue (situation → required behavior)

1. **A student already holds the slot** → reject the whole registration; name all conflicting IDs and the slot; no details about the other team.
2. **Two captains submit the same student at the same moment** → the lock serializes; the second request fails with the conflict message.
3. **Same College ID listed twice in a team** → reject.
4. **Captain also listed as a member / no captain / two captains** → reject; exactly one captain, counted once.
5. **Team size below TeamMin or above TeamMax** → reject; the form also prevents it.
6. **Student already holds all four slots** → any further registration is rejected by the slot rule.
7. **Same group enters two events** → two separate registrations with separate RegIDs; allowed if slots differ.
8. **A member is on different teams in different slots** → allowed.
9. **Existing student appears again with different phone/email/etc.** → keep stored values; add `CONTACT_DIFFERS`.
10. **Retry after double-click or network failure** → idempotency key returns the original RegID; no duplicate, no false conflict.
11. **UTR already used by a pending or verified payment** → reject. **UTR from a rejected payment** → allowed again.
12. **Client sends a different amount** → ignored; the server uses Events.Fee.
13. **Oversized, wrong-type, or HEIC screenshot** → reject with a clear message (client first, server again).
14. **Drive upload fails** → abort before any sheet write; nothing saved.
15. **A sheet write fails after the upload** → roll back writes and trash the uploaded file.
16. **Lock not acquired within the wait time** → "busy, please retry"; nothing saved.
17. **Event closed while the student is filling the form** → server rejects on submit with a clear message; form data is preserved.
18. **Payment rejected** → registration cancelled, all members' slots freed, team re-registers.
19. **Registration cancelled** → every member's slot freed at once; UTR record kept.
20. **Member swap** → the new member's slot is checked; the old member's slot freed; captain swap forces captain reassignment.
21. **Removing a member would break TeamMin** → refuse.
22. **ID typed in lowercase or with spaces** → normalized before validation.
23. **Phone with spaces, `+91`, or leading `0`** → normalized; the final value must be a valid 10-digit number.
24. **Input starting with `=`, `+`, `-`, `@`** → neutralized in the sheet and in exports.
25. **ASH selected** → Year locked to 1st. **MBA/MCA selected** → Year limited to 1st and 2nd (default).
26. **ID branch letters differ from the chosen Branch or are not in the list** → accept; flag `BRANCH_MISMATCH`.
27. **Admin brute-force** → lockout after 5 failures; sessions expire after about 2 hours.
28. **Admin edits slot cells or deletes rows by hand** → unsupported; recover with the maintenance rebuild of the slot ledger (5.1.5).
29. **Backend slow or cold start** → keep the spinner, 45-second patience message, same-key retry.
30. **Backend returns an unreadable response** → show a generic failure with a retry; never assume success.
31. **Event IDs or fees change** → nothing breaks, because rules come from the Events sheet and behavior is data-driven (3.3.4).
32. **Gamer Fiesta team tries to pick a second game** → impossible: one game field, one Slot 2 registration.
33. **Duplicate team name in the same event** → reject (default).
34. **TechSnap undecided details** → generic registration only; no submission upload.
35. **The student's own registration is the first time a member is seen** → creates the row; every member's full details are mandatory so no partial rows exist.

---

## 16. Acceptance scenarios

1. Solo free event: valid ID and details → `confirmed` RegID, one Team_Members row, the student's slot cell set.
2. Student registers a Slot 1 event, then a second Slot 1 event → second is rejected naming the slot.
3. Team of 4 for a Slot 3 event where one member already holds Slot 3 → whole team rejected, nothing written.
4. Same student in a Slot 1 team and a Slot 2 team → both succeed with two RegIDs.
5. Gamer Fiesta team with a chosen game, valid UTR, and screenshot → `pending_verification`; admin verifies → `confirmed`.
6. Reuse of a pending UTR by another team → rejected. Reuse after the first payment was rejected → accepted.
7. Admin rejects a payment → registration cancelled, all members' slots free, they can re-register.
8. Admin swaps a member → old slot freed, new member's slot taken, contacts view reflects it.
9. Double-click on submit → exactly one registration.
10. Close an event in the Events sheet → new registrations blocked, existing ones unchanged.
11. Wrong admin password five times → login locked.
12. Request with a tampered fee or event rules in the payload → the server's values are used.
13. Student with an unlisted ID branch code → registers, row flagged.
14. Screenshot over the size limit or in the wrong format → rejected with no partial data.

---

## 17. Items to confirm and deferred work

### Defaults to confirm before build (tagged *(default)* above)
- A rejected payment cancels the registration; the team re-registers (no resubmission flow).
- MBA and MCA limited to 1st and 2nd year.
- Branch mismatch is flagged, not rejected.
- Both UTR and screenshot are required for Gamer Fiesta.
- Team name unique within an event; name length 2 to 40.
- Phone rule: 10 digits starting 6 to 9 after normalization.
- Throttle of 5 submissions per 10 minutes; admin lockout after 5 failures for 15 minutes.
- Daily backup, keeping 7 copies.
- Admin login asks for a name for audit purposes.

### Data the organizers must supply
- TeamMin and TeamMax for every event (Gamer Fiesta's limits are not yet fixed).
- Which events are solo vs team.
- A sample real College ID from each of the ten branch codes, to confirm the pattern (including the 4 to 5 digit tail).

### Deferred (not in this build)
- TechSnap submission mechanism.
- Email confirmations (script mail quota is limited on a personal account).
- Event capacity limits.
- Bot challenge (e.g. Cloudflare Turnstile) beyond the honeypot and throttle.
- Per-coordinator access to the data.
- Any migration to Firebase or another database.
