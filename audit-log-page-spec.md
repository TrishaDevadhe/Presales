# GravitySales — Audit Log Page: Design & Build Spec

## Goal
Build an Audit Log system with two distinct categories — a **business Activity Log** (who changed what data) and a **security Access Log** (sign-in/out, failed logins) — plus a lightweight **embedded History** view on individual records for non-admin users. Follow the existing design tokens, icon system, tab component, and tint-badge system already established in the project (`.tab-group`, `.section-kicker`, `.page-icon-badge`, badge tint tokens) — do not introduce new colors or components where an existing pattern already fits.

---

## PART A — Who Sees What (Information Architecture)

Do not build one audit page that changes contents per role. Instead, build **one full Admin-only page**, plus **embedded per-record history** everywhere else. This avoids maintaining multiple versions of the same view.

| Surface | Who | What they see |
|---|---|---|
| **Audit Log page** (new nav item, Admin Console area) | `userRole === 'Admin'` only, same gating pattern as `AdminTab.js` | Full Activity Log + Access Log, unfiltered by default, all users, all entities |
| **"History" tab on individual records** (Opportunity detail, Work Item detail, etc.) | Any user who already has access to that record | Only that record's change history — reuses the same underlying data/component as the Activity Log, filtered to one entity |
| **"My Sign-In Activity"** (Account/Profile area, not Admin Console) | Any logged-in user | Their own login history only — a self-service "was this me?" view, not other users' data |

Non-admins never see a company-wide log of other people's actions. This is a permissions rule, not just a UI choice — enforce it at the API/query level, not only by hiding the nav item.

---

## PART B — Page Layout (Admin Audit Log page)

Follow the established page header pattern: `.page-icon-badge` (icon: `shield-check`, tint: Danger — this page tracks security/accountability, so it should read as deliberately serious, unlike other pages' lighter tints) + `.section-kicker` ("System Accountability") + page title ("Audit Log").

Below the header, a `.tab-group` with two tabs:

```
[ Activity Log ]  [ Access Log ]
```

Below the tabs, a filter row (same filter-bar styling as Effort Logs / Work Items pages):

- Date range picker
- User (searchable dropdown, all users)
- Entity Type (Opportunity / Work Item / Effort Log / Proposal Revision / Feedback / Resource Profile / Admin Config) — Activity Log tab only
- Action Type (Created / Updated / Deleted / Status Changed / Assigned) — Activity Log tab only
- Event Type (Login Success / Login Failure / Logout / Session Expired) — Access Log tab only

Filters relevant to the inactive tab should hide, not just disable, to avoid clutter.

---

## PART C — "Activity Log" Tab

### Table columns
| Column | Notes |
|---|---|
| Timestamp | Exact date + time, sortable, most recent first by default |
| Actor | Name/avatar of user who performed the action |
| Acting As (conditional) | See Part F — only rendered when the action happened during impersonation |
| Action | Icon + label: Created / Updated / Deleted / Status Changed / Assigned / Reverted |
| Entity | Entity type + a link to the record (e.g. "Opportunity — Google Cloud ERP Upgrade") |
| Field Changed | Only populated for Update/Status Changed rows |
| Summary | One-line human-readable summary, e.g. "Deal Stage: Proposal → Negotiation" |
| Expand control | Chevron to reveal full before/after diff |

### Row expansion (before → after diff)
Clicking a row expands inline to show the full diff, not just the summary:

```css
.audit-diff-row {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin: 4px 0 8px;
  font-family: 'Inter', monospace;
  font-size: 0.85rem;
}
.audit-diff-before { color: var(--color-danger-text); text-decoration: line-through; opacity: 0.7; }
.audit-diff-after { color: var(--color-success-text); font-weight: 600; }
```

If a field changed involves free text/notes rather than a simple value, show a truncated before/after with a "view full" expand rather than dumping a wall of text into the row.

### Action-type icon mapping
Reuse the existing icon-severity system (Lucide + tint tokens):

| Action | Icon | Tint |
|---|---|---|
| Created | `plus-circle` | Success |
| Updated | `pencil` | Info |
| Status Changed | `refresh-cw` | Info |
| Assigned/Reassigned | `user-check` | Purple accent |
| Deleted | `trash-2` | Danger |
| Reverted | `undo-2` | Warning |

### What must be logged here (do not log page views/navigation)
Opportunities (created, deal stage change, value change, priority change, owner reassignment, deletion); Work Items (created, status change — especially → Blocked, with blocker note captured in the diff — reassignment, due date change, deletion); Effort Logs (created, edited, deleted); Proposal Revisions (new version created, which scope flags changed, rework hours); Client Feedback (severity changes, converted-to-work-item); **Admin Console changes** (picklist edits, threshold changes) — treat these as high-priority entries, since a single config change silently affects every user's risk/overload calculations.

---

## PART D — "Access Log" Tab

### Table columns
| Column | Notes |
|---|---|
| Timestamp | Exact date + time |
| User | Who attempted/completed authentication |
| Event | Login Success / Login Failure / Logout / Session Expired |
| IP Address | |
| Device/User-Agent | If available from the auth provider |
| Failure Reason | Only for Login Failure rows (wrong password, account locked, etc.) |

### Failed logins need visual priority, not just a row
A cluster of failed logins is the earliest signal of a compromised account — don't let it read the same as routine activity:

- `Login Failure` rows use the Danger tint badge on the Event column, same visual weight as a "Critical" severity elsewhere in the app.
- If the same user has **3+ failed logins within 15 minutes**, surface a small inline alert banner (reuse `.alert-banner` from the icon system doc, `alert-octagon` icon, Danger tint) above the table: *"Repeated failed login attempts detected for [user] — review recommended."* This is a simple client-side/query-side threshold, not a new backend service — flag it as a nice-to-have if the failed-login data isn't already queryable cheaply.

---

## PART E — Embedded "History" Tab on Individual Records

On Opportunity detail, Work Item detail, and similar record views, add a `History` tab alongside existing tabs (Details, etc.). This reuses the exact same table/diff component as Part C, pre-filtered to `entity_id = this record`, with the Entity column removed (redundant in this context) and no filter row (already scoped).

Available to any user who has access to the record itself — not gated to Admin. This is what most non-admin users will actually use day-to-day ("who changed this due date"), rather than a full company-wide log they'd never be granted anyway.

---

## PART F — Impersonation: Log Both Identities

The app already supports user impersonation (`useApp()`, `handleUserChange`). Every logged event — both Activity Log and Access Log — must capture **two identities** when impersonation is active:

- `real_user_id` — who actually authenticated
- `acting_as_user_id` — who they were impersonating at the time of the action (null if not impersonating)

### Display rule
When `acting_as_user_id` is present, the Actor column shows the impersonated user's name with a small secondary label beneath it: `via [Real Admin Name]`, styled with the `.section-kicker` visual language (small, muted, unmistakably secondary to the main name) — never hide the real actor, and never show the impersonated identity as if it were the sole actor. This is the single most important integrity requirement in this entire spec — without it, impersonated actions are indistinguishable from the impersonated user's own actions, which defeats the purpose of the log.

---

## PART G — Data Model Requirements (for backend/API, not just UI)

Every audit entry needs, at minimum:

```
id, timestamp, real_user_id, acting_as_user_id (nullable),
entity_type, entity_id, action_type,
field_changed (nullable), value_before (nullable), value_after (nullable),
summary_text
```

Every access-log entry needs:

```
id, timestamp, user_id, event_type, ip_address, user_agent, failure_reason (nullable)
```

Check what Supabase Auth already captures natively before building custom access-event logging from scratch — some of this (session events, failed logins) may already exist and just need to be surfaced in the UI rather than re-implemented.

---

## PART H — Immutability Rules (non-negotiable)

- No UI anywhere — including Admin views — may edit or delete an existing audit or access log entry. There is no Edit/Delete action column on this page, unlike every other table in the app.
- Corrections to a mistaken log entry (should essentially never happen, but must be handled if it does) are made by writing a **new** entry referencing the old one, never by mutating the original.
- This page has no "Add" action either — entries are only ever system-generated from real events, never manually created.

---

## PART I — Empty States

Use the standard empty-state pattern (muted 48px icon + short message):
- No activity yet for current filters → `list-checks` icon, "No activity matches these filters."
- No access events yet → `shield-check` icon, "No login activity recorded yet."

---

## Explicitly Out of Scope for This Build
- Do not build alerting/notifications off this data yet (e.g., emailing an Admin on repeated failed logins) — the inline banner in Part D is UI-only for now.
- Do not add export/download of audit data in this pass unless separately requested — flag as a likely future ask (compliance teams often want CSV export) but don't build it speculatively.
