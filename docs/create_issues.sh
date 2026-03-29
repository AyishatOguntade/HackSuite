#!/usr/bin/env bash
export PATH="$PATH:/c/Users/Owner/AppData/Local/gh/bin"
REPO="AyishatOguntade/HackSuite"

ci() {
  local title="$1" labels="$2" milestone="$3" bodyfile="$4"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$milestone" --body-file "$bodyfile" 2>&1 | grep -oP 'https://\S+'
  sleep 0.6
}

TMPDIR="/c/Users/Owner/AppData/Local/Temp"

# ── Sprint 1: Registration ──────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to build a custom registration form with conditional logic so that I collect exactly the data my event needs.

**Story Points:** 13

## Acceptance Criteria
- [ ] Field types: text, textarea, email, select, multi-select, checkbox, file upload, section header
- [ ] Conditional display: show/hide field based on another field's value
- [ ] Field-level validation: required, min/max length, regex pattern
- [ ] Form preview renders participant-facing view in real time
- [ ] Form schema stored as JSONB; versioned when changed after submissions exist
- [ ] MLH consent checkbox as built-in field type with official MLH copy

## Tests
- `T-020-1`: Conditional field "Team name" shown only when "Have a team?" = Yes — preview correct
- `T-020-2`: Required field missing on submit — 422 with field name
- `T-020-3`: File upload — stored in S3; participant record has signed URL
- `T-020-4`: Update form after 10 submissions — existing submissions readable
- `T-020-5`: MLH consent field — official copy, uneditable
BODY
ci "[US-020] Custom Application Form Builder" "E-01: Registration,P0: Critical,type: user-story,sprint: 1,points: 13" "Sprint 1 — Registration" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a participant, I want to submit an application and receive a confirmation so that I know my registration was received.

**Story Points:** 5

## Acceptance Criteria
- [ ] Form accessible at `{event-slug}.hacksuite.app` without login
- [ ] Submission creates participant record with status `applied`
- [ ] Duplicate: same email + event_id returns 409 "already applied"
- [ ] Confirmation email sent within 60 seconds
- [ ] Participant receives a "check your status" link

## Tests
- `T-021-1`: Submit — record created status "applied"; confirmation email received
- `T-021-2`: Submit same email twice — 409, no duplicate record
- `T-021-3`: Missing required field — 422 with field name
- `T-021-4`: Status link in email — shows "Application received"
BODY
ci "[US-021] Participant Application Submission" "E-01: Registration,P0: Critical,type: user-story,sprint: 1,points: 5" "Sprint 1 — Registration" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to accept, reject, and waitlist applicants with bulk actions so that I can process hundreds of applications efficiently.

**Story Points:** 8

## Acceptance Criteria
- [ ] Dashboard with status filters and column sort
- [ ] Bulk actions: accept / waitlist / reject N participants
- [ ] Accepted participants receive email with unique QR code (SVG)
- [ ] Auto-promotion: top waitlisted participant promoted when RSVP deadline passes
- [ ] Auto-accept mode: first N applicants accepted on submission

## Tests
- `T-022-1`: Bulk-accept 50 — all updated; 50 QR emails queued within 5 minutes
- `T-022-2`: Accepted misses RSVP deadline — top waitlist participant promoted and emailed
- `T-022-3`: Auto-accept for 200 — 201st gets waitlist email
- `T-022-4`: Bulk-reject 10 — updated; rejected email sent; cannot re-apply
- `T-022-5`: Filter waitlisted + school "URI" — correct filtered set
BODY
ci "[US-022] Acceptance Workflow & Waitlist Management" "E-01: Registration,P0: Critical,type: user-story,sprint: 1,points: 8" "Sprint 1 — Registration" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to customize the public registration page with my event's branding.

**Story Points:** 5

## Acceptance Criteria
- [ ] Settings panel: logo, primary color, cover image, hero text, social links
- [ ] Changes preview live before publish
- [ ] Published at `{event-slug}.hacksuite.app`
- [ ] Renders correctly at 375px and 1280px
- [ ] Open Graph meta tags populated for social sharing

## Tests
- `T-023-1`: Upload logo, set color #7C3AED — landing page reflects changes immediately
- `T-023-2`: View at 375px — no horizontal scroll; CTA above fold
- `T-023-3`: Share URL — og:title and og:image render in Slack preview
- `T-023-4`: Toggle registration closed — form hidden, message shown
BODY
ci "[US-023] Registration Landing Page Customization" "E-01: Registration,P0: Critical,type: user-story,sprint: 1,points: 5" "Sprint 1 — Registration" "$TMPDIR/issue.md"

# ── Sprint 2: Check-in ──────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer on event day, I want to scan participant QR codes from my phone browser without installing an app.

**Story Points:** 13

## Acceptance Criteria
- [ ] Camera via WebRTC; works iOS Safari 16+ and Android Chrome 110+
- [ ] QR decoded client-side (jsQR/zxing-js); POSTed to `/events/:id/checkin`
- [ ] Scan-to-response <= 300ms on 3G
- [ ] Success: name + accommodation flags shown 2s; auto-reset
- [ ] Error states: "already checked in" (amber), "not found" (red), "not accepted" (red)

## Tests
- `T-030-1`: Scan valid QR on 3G throttle — response within 300ms
- `T-030-2`: Dietary "vegan" — VEGAN flag shown prominently
- `T-030-3`: Scan same QR twice — "Already checked in at [time]" amber
- `T-030-4`: iOS Safari — camera opens, no app install prompt
- `T-030-5`: Waitlisted QR — red "Participant not accepted"
BODY
ci "[US-030] Mobile QR Scanner (No App Required)" "E-02: Check-in,P0: Critical,type: user-story,sprint: 2,points: 13" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want check-in to work when the venue WiFi fails so that a network outage does not cause a 200-person queue.

**Story Points:** 13

## Acceptance Criteria
- [ ] PWA service worker caches check-in shell and QR lookup on page load
- [ ] Offline: scans write to IndexedDB `{ qr_code, scanned_at, device_id, synced: false }`
- [ ] Offline banner + queued scan count visible
- [ ] On reconnect: auto-syncs via `POST /events/:id/checkin/sync`
- [ ] Server deduplicates; returns conflicts array
- [ ] Conflicts shown in dashboard for manual review

## Tests
- `T-031-1`: Offline, scan 5 QR codes — 5 in IndexedDB; banner shows "5 scans queued"
- `T-031-2`: Reconnect — 5 scans sync; participants marked checked_in
- `T-031-3`: Two devices scan same QR offline — conflict in dashboard
- `T-031-4`: Reload offline — scanner loads from service worker cache
BODY
ci "[US-031] Offline Check-in Mode" "E-02: Check-in,P0: Critical,type: user-story,sprint: 2,points: 13" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want a real-time dashboard showing check-in progress so I can spot issues instantly.

**Story Points:** 8

## Acceptance Criteria
- [ ] Shows: checked in, confirmed total, no-shows, accommodations count
- [ ] Updates in real time via WebSocket
- [ ] Activity feed: last 20 check-in events, live-updating
- [ ] Filterable list: status, school, dietary flags
- [ ] Export checked-in list as CSV

## Tests
- `T-032-1`: Scan QR on another device — counter increments within 500ms
- `T-032-2`: 50 simultaneous check-ins — all reflected within 2 seconds
- `T-032-3`: Filter "gluten-free" — only gluten-free checked-in returned
- `T-032-4`: Export CSV — correct headers, one row per checked-in participant
BODY
ci "[US-032] Live Check-in Dashboard" "E-02: Check-in,P0: Critical,type: user-story,sprint: 2,points: 8" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to register and check in a walk-in participant on the spot so unregistered attendees are not turned away.

**Story Points:** 3

## Acceptance Criteria
- [ ] Walk-in button: minimal form (first name, last name, email, school)
- [ ] Creates participant with `checked_in` status immediately
- [ ] QR code displayed on-screen for badge printing
- [ ] Walk-in participants marked with "walk-in" flag in dashboard

## Tests
- `T-033-1`: Complete walk-in form — checked_in status; QR on screen within 1 second
- `T-033-2`: Walk-in with existing email — "Email already registered", option to search
- `T-033-3`: Walk-in participant shows "walk-in" badge in dashboard
BODY
ci "[US-033] Walk-in Registration" "E-02: Check-in,P0: Critical,type: user-story,sprint: 2,points: 3" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

# ── Sprint 2: Schedule ──────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to build the event agenda with time blocks and room assignments so I have a conflict-free schedule to publish.

**Story Points:** 8

## Acceptance Criteria
- [ ] Create block: title, type (workshop/meal/judging/ceremony/break), start, end, location, capacity
- [ ] Visual timeline by time and room
- [ ] Conflict detection: overlapping blocks in same room triggers blocking warning
- [ ] Publish toggle makes schedule visible to participants

## Tests
- `T-040-1`: Create "Opening Ceremony" 9:00-9:30 Room A — appears on timeline
- `T-040-2`: Overlapping block same room — warning fires; not saved until resolved
- `T-040-3`: Publish — /schedule shows agenda; unpublish hides it
- `T-040-4`: 20 blocks — timeline renders without degradation
BODY
ci "[US-040] Agenda Builder" "E-03: Schedule,P1: High,type: user-story,sprint: 2,points: 8" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a participant, I want to view the event schedule on my phone without logging in.

**Story Points:** 5

## Acceptance Criteria
- [ ] Schedule at `{event-slug}.hacksuite.app/schedule` — no login required
- [ ] Mobile-optimized at 375px; tap to expand block details
- [ ] "Now" indicator shows current time position
- [ ] Updates pushed via WebSocket — no page refresh needed
- [ ] Cached for offline read after first load

## Tests
- `T-041-1`: 375px — no horizontal scroll; blocks readable
- `T-041-2`: Organizer updates block — participant page reflects within 1 second
- `T-041-3`: Load, go offline, reload — loads from cache; offline banner shown
- `T-041-4`: "Now" indicator at correct position
BODY
ci "[US-041] Participant-Facing Schedule" "E-03: Schedule,P1: High,type: user-story,sprint: 2,points: 5" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to send push notifications to checked-in participants so I can announce schedule changes without a PA system.

**Story Points:** 8

## Acceptance Criteria
- [ ] Participants prompted for Web Push on first schedule page load
- [ ] Compose: title (50 char max), body (140 char max), target (all/checked-in/by track/by dietary)
- [ ] Preview shows estimated recipient count before send
- [ ] Delivered via Web Push API (VAPID keys server-managed)
- [ ] Sent notification log with target count and delivered count

## Tests
- `T-042-1`: Send to "all checked-in" 100 participants — notification within 10 seconds
- `T-042-2`: Target "vegan" dietary flag — only vegan participants receive it
- `T-042-3`: 141-char body — validation error before send
- `T-042-4`: Participant denied push — not in delivery count; no error thrown
BODY
ci "[US-042] Push Notifications to Participants" "E-03: Schedule,P1: High,type: user-story,sprint: 2,points: 8" "Sprint 2 — Check-in & Schedule" "$TMPDIR/issue.md"

# ── Sprint 3: Judging ───────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a participant, I want to submit my project with all relevant links and track selection so that judges can evaluate my work.

**Story Points:** 8

## Acceptance Criteria
- [ ] Submission form: title, description (markdown with live preview), demo URL, repo URL, track (multi-select), optional file (< 50MB)
- [ ] One submission per team; all team members can edit until portal closes
- [ ] Portal enforces open/close timestamps; submitting outside window returns 403
- [ ] Last-edit timestamp shown; edit history retained (not shown to judges)
- [ ] Confirmation email sent to all team members

## Tests
- `T-050-1`: Submit project — created; confirmation email to all 3 team members
- `T-050-2`: Second team member edits description — saved; first member sees update on refresh
- `T-050-3`: Submit after close time — 403 "Submissions closed at [time]"
- `T-050-4`: Markdown with headers and code blocks — preview renders correctly
- `T-050-5`: Upload 51MB file — rejected "File exceeds 50MB limit"
BODY
ci "[US-050] Project Submission Portal" "E-04: Judging,P0: Critical,type: user-story,sprint: 3,points: 8" "Sprint 3 — Judging & Submissions" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to assign judges to tracks and have the system balance workloads automatically.

**Story Points:** 8

## Acceptance Criteria
- [ ] Organizer assigns judges to one or more tracks
- [ ] System distributes submissions round-robin within a track
- [ ] Double-booking detection: judge assigned to overlapping schedule slots triggers blocking alert
- [ ] Judge receives magic link email (no account required)
- [ ] Workload summary: submissions per judge, scored vs. unscored

## Tests
- `T-051-1`: Assign 3 judges to track with 30 submissions — each assigned 10 automatically
- `T-051-2`: Same judge assigned to overlapping tracks — conflict warning; not saved until resolved
- `T-051-3`: Judge clicks magic link — lands on queue; no password required
- `T-051-4`: Magic link after event end — "Judging has closed" message
BODY
ci "[US-051] Judge Assignment & Workload Balancing" "E-04: Judging,P0: Critical,type: user-story,sprint: 3,points: 8" "Sprint 3 — Judging & Submissions" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a judge, I want to score submissions on a clear rubric from my phone so I can evaluate projects quickly.

**Story Points:** 8

## Acceptance Criteria
- [ ] Rubric configurable per track: up to 8 criteria, each with label, description, max score (1-10)
- [ ] Mobile-optimized portal: one submission at a time with all links accessible
- [ ] Scores auto-save on change; no explicit submit button per criterion
- [ ] Judges cannot see other judges scores until organizer publishes
- [ ] Progress indicator: "7 of 10 submissions scored"

## Tests
- `T-052-1`: Score all criteria on mobile 375px — all sliders accessible without horizontal scroll
- `T-052-2`: Close browser mid-scoring and reopen magic link — scores preserved
- `T-052-3`: View another judge's scores via API — 403 returned
- `T-052-4`: Score 9 of 10 — progress shows "9 of 10"; incomplete flagged for organizer
BODY
ci "[US-052] Scoring Rubric & Judge Portal" "E-04: Judging,P0: Critical,type: user-story,sprint: 3,points: 8" "Sprint 3 — Judging & Submissions" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want a live leaderboard that updates as judges submit scores so I can announce winners immediately when scoring closes.

**Story Points:** 5

## Acceptance Criteria
- [ ] Leaderboard per track ranked by weighted average score
- [ ] Updates in real time via WebSocket
- [ ] Organizer can toggle public visibility (hidden by default)
- [ ] Configurable tie-breaking: random or secondary criterion
- [ ] CSV export: all submissions, scores, final rankings

## Tests
- `T-053-1`: Judge submits score — leaderboard rank updates within 1 second
- `T-053-2`: Toggle public — participants can view at `/events/:id/leaderboard/:track`
- `T-053-3`: Tied submissions — tie-breaking applied; deterministic result on reload
- `T-053-4`: Export CSV — submission, team, each criterion score, final score, rank
BODY
ci "[US-053] Live Leaderboard & Results" "E-04: Judging,P0: Critical,type: user-story,sprint: 3,points: 5" "Sprint 3 — Judging & Submissions" "$TMPDIR/issue.md"

# ── Sprint 4: Sponsors ──────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to create sponsor profiles with tiers and track deliverables so I never miss a sponsorship commitment.

**Story Points:** 8

## Acceptance Criteria
- [ ] Organizer defines tiers (name, benefits, amount) before adding sponsors
- [ ] Sponsor profile: name, tier, POC (name + email + phone), logo upload, description, payment status
- [ ] Deliverable checklist: title, due date, completion toggle, evidence attachment
- [ ] Overdue deliverables surface as red alerts in organizer dashboard header
- [ ] Sponsor list sortable by tier, payment status, deliverable completion rate

## Tests
- `T-060-1`: Create "Gold" tier; add "Acme Corp" at Gold — profile with Gold badge
- `T-060-2`: Add deliverable due today, leave incomplete — alert in dashboard header
- `T-060-3`: Mark deliverable complete with evidence URL — green checkmark; alert clears
- `T-060-4`: Log $2,000 against $5,000 expected — "$2,000 / $5,000 received"
BODY
ci "[US-060] Sponsor Profile & Tier Management" "E-05: Sponsors,P1: High,type: user-story,sprint: 4,points: 8" "Sprint 4 — Sponsors & Finance" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a sponsor contact, I want to log in and view my sponsorship profile and deliverable status without emailing the organizing team.

**Story Points:** 5

## Acceptance Criteria
- [ ] Organizer grants access by entering sponsor POC email
- [ ] Sponsor receives magic link to read-only portal (profile, deliverables, payment status)
- [ ] Sponsor cannot view other sponsors data
- [ ] Post-event: portal shows recap metrics (attendance, demographics, prize winners)

## Tests
- `T-061-1`: Grant portal access to sponsor@acme.com — invite email sent
- `T-061-2`: Sponsor clicks link — sees only their own profile
- `T-061-3`: Access another sponsor's profile URL — 403 returned
- `T-061-4`: Post-event: portal shows attendance figure and prize track winner
BODY
ci "[US-061] Sponsor Portal (Read-Only)" "E-05: Sponsors,P1: High,type: user-story,sprint: 4,points: 5" "Sprint 4 — Sponsors & Finance" "$TMPDIR/issue.md"

# ── Sprint 4: Finance ───────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to build a budget and track actual spend against it so I can justify costs to university administration.

**Story Points:** 8

## Acceptance Criteria
- [ ] Budget line items: category (catering/swag/venue/prizes/travel/AV/misc), description, estimated amount
- [ ] Income tracked: university funding, MLH grant, sponsor payments (auto from Sponsor module)
- [ ] Dashboard: total income, estimated, actual, variance, remaining balance
- [ ] Per-head cost: total actual spend / confirmed check-in count (live)
- [ ] Visual flag if actual exceeds estimated on any line item

## Tests
- `T-070-1`: "Catering" estimated $3,000; log $3,200 actual — red variance flag; balance updates
- `T-070-2`: Log sponsor payment in Sponsor module — Finance shows income +$5,000 automatically
- `T-070-3`: 150 participants check in — per-head cost updates live
- `T-070-4`: Dashboard totals match sum of all line items
BODY
ci "[US-070] Budget Planning & Tracking" "E-06: Finance,P1: High,type: user-story,sprint: 4,points: 8" "Sprint 4 — Sponsors & Finance" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to submit expenses with receipts and get reimbursed through the platform so reimbursements do not get lost in email chains.

**Story Points:** 8

## Acceptance Criteria
- [ ] Submit: amount, category, description, receipt (image or PDF, max 10MB)
- [ ] Workflow: submitted → approved → paid (or rejected)
- [ ] Approval requires admin or owner; approver cannot approve own expense
- [ ] Rejected expenses require reason; submitter emailed
- [ ] Export all expenses as CSV

## Tests
- `T-071-1`: Submit $45 "Printer paper" with receipt — status "submitted"; admin sees in queue
- `T-071-2`: Admin approves — status "approved"; submitter receives email
- `T-071-3`: Submitter tries to approve own expense — button disabled; API returns 403
- `T-071-4`: Admin rejects with reason — submitter receives rejection reason email
- `T-071-5`: Export CSV — all columns present; amounts sum correctly
BODY
ci "[US-071] Expense Submission & Reimbursement Workflow" "E-06: Finance,P1: High,type: user-story,sprint: 4,points: 8" "Sprint 4 — Sponsors & Finance" "$TMPDIR/issue.md"

# ── Sprint 5: Marketing ─────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to send branded emails to participant segments so I can drive registrations without a separate email tool.

**Story Points:** 13

## Acceptance Criteria
- [ ] Block-based editor: text, image, button, divider, header; drag to reorder
- [ ] Pre-built templates: "Applications Open", "You're Accepted", "Event Reminder", "Results Announced"
- [ ] Recipient targeting: all / accepted / waitlisted / custom filter
- [ ] Schedule send or send immediately
- [ ] Metrics: delivered, opened, clicked (via webhook)
- [ ] Unsubscribe link auto-injected; unsubscribed excluded from future sends

## Tests
- `T-080-1`: Build "Applications Open" template, customize hero — preview renders correctly
- `T-080-2`: Schedule send for +1 hour — sends at correct time; metrics update
- `T-080-3`: Send to "accepted only" — only accepted participants receive it
- `T-080-4`: Participant unsubscribes — excluded from next campaign
- `T-080-5`: Send to 500 participants — all delivered within 10 minutes
BODY
ci "[US-080] Email Campaign Builder" "E-07: Marketing,P2: Medium,type: user-story,sprint: 5,points: 13" "Sprint 5 — Marketing & Reporting" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want to see which marketing channels are driving registrations so I know where to focus outreach effort.

**Story Points:** 8

## Acceptance Criteria
- [ ] Generate UTM-tagged referral links per channel (Instagram, Discord, flyer QR, email footer)
- [ ] Each click tracked; conversion tracked when application submitted through that link
- [ ] Hype dashboard: registration growth chart, breakdown by source, conversion rate per channel
- [ ] Landing page visit counter (privacy-respecting; no PII per visit)
- [ ] Dashboard refreshes every 5 minutes

## Tests
- `T-081-1`: Generate "Instagram bio" link — UTM params correct; redirects to registration
- `T-081-2`: Click link and submit — attributed to Instagram in dashboard
- `T-081-3`: Dashboard shows growth chart and Instagram vs Discord conversion
- `T-081-4`: Dashboard shows conversion rate: submissions / page views per channel
BODY
ci "[US-081] Referral Link Tracking & Hype Dashboard" "E-07: Marketing,P2: Medium,type: user-story,sprint: 5,points: 8" "Sprint 5 — Marketing & Reporting" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want AI-generated social captions for my event so I spend 5 minutes on marketing copy instead of 45.

**Story Points:** 5

## Acceptance Criteria
- [ ] Input: event name, dates, location, theme, target audience
- [ ] Generates drafts for: Twitter/X (280 char), Instagram, LinkedIn, Discord
- [ ] Output editable in-place before copying
- [ ] "Regenerate" button produces a new variation
- [ ] Calls Claude API (claude-sonnet-4-6) via backend; API key never exposed to client

## Tests
- `T-082-1`: Enter event details — 4 distinct captions produced within 5 seconds
- `T-082-2`: Twitter/X output <= 280 characters
- `T-082-3`: Click "Regenerate" — new, different variation produced
- `T-082-4`: Edit generated caption — edited text preserved in copy-to-clipboard
- `T-082-5`: Inspect network traffic — Claude API key not present in any client-side request
BODY
ci "[US-082] Social Copy Generator (Claude API)" "E-07: Marketing,P2: Medium,type: user-story,sprint: 5,points: 5" "Sprint 5 — Marketing & Reporting" "$TMPDIR/issue.md"

# ── Sprint 5: Reporting ─────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want the post-event report to be auto-populated from live data so I spend 20 minutes writing a summary rather than 4 hours copying data between docs.

**Story Points:** 13

## Acceptance Criteria
- [ ] Report auto-assembles after event end date: attendance, demographics, judging results, budget summary, top channels
- [ ] Organizer can add written summary (rich text) and up to 20 photos
- [ ] Internal export: all sections. Sponsor export: no budget figures
- [ ] PDF export as async job; download link emailed when ready (< 30s)
- [ ] Report snapshot immutable once exported
- [ ] Shareable org-scoped link for institutional handoff

## Tests
- `T-090-1`: Trigger report after event end — all sections populated; no manual data entry
- `T-090-2`: Export internal PDF — all sections including budget present
- `T-090-3`: Export sponsor PDF — no budget section; only sponsor-relevant metrics
- `T-090-4`: Export PDF — download link emailed within 30 seconds
- `T-090-5`: Share link — next year's organizer can view without login
- `T-090-6`: Re-export after editing summary — new snapshot; old unchanged
BODY
ci "[US-090] Auto-Assembled Event Report" "E-08: Reporting,P1: High,type: user-story,sprint: 5,points: 13" "Sprint 5 — Marketing & Reporting" "$TMPDIR/issue.md"

# ── Sprint 6: Hardening ─────────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## Task
Simulate 1,000 simultaneous QR scans against staging and verify p99 latency < 300ms.

## Acceptance Criteria
- [ ] Load test script written (k6 or Artillery)
- [ ] 1,000 virtual users scanning simultaneously
- [ ] p99 response time < 300ms
- [ ] Zero 5xx errors under load
- [ ] Results documented and attached to this issue
BODY
ci "[Sprint 6] Load Test: 1,000 Simultaneous QR Scans" "E-02: Check-in,P0: Critical,type: chore,sprint: 6,points: 8" "Sprint 6 — Hardening & Beta Prep" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## Task
Run axe-core automated audit and manual review on all participant-facing pages.

## Acceptance Criteria
- [ ] axe-core integrated in CI — fails build on any WCAG AA violation
- [ ] Manual keyboard navigation audit: registration form, schedule, submission portal
- [ ] Screen reader test on primary participant flows (NVDA or VoiceOver)
- [ ] 0 WCAG AA violations on all participant-facing pages
- [ ] Remediation for any issues found
BODY
ci "[Sprint 6] WCAG 2.1 AA Accessibility Audit" "E-01: Registration,P1: High,type: chore,sprint: 6,points: 8" "Sprint 6 — Hardening & Beta Prep" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## Task
Internal security review covering tenant isolation, input validation, and file upload safety.

## Acceptance Criteria
- [ ] RLS policy audit: every table has correct org_id/event_id scoping
- [ ] Input validation sweep: all endpoints server-side validated; parameterized queries confirmed
- [ ] File upload: type allowlist enforced; virus scan integrated; private S3 with signed URLs only
- [ ] Audit log: immutable log of status changes on participants, expenses, deliverables
- [ ] Dependency scan clean — no critical CVEs unaddressed
- [ ] Tech Lead sign-off documented
BODY
ci "[Sprint 6] Security Review: RLS, Input Validation, File Upload Hardening" "E-00: Infrastructure,P0: Critical,type: chore,sprint: 6,points: 13" "Sprint 6 — Hardening & Beta Prep" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## Task
Write Playwright E2E tests covering the critical event lifecycle paths.

## Critical Paths to Cover
- [ ] Registration: create form → participant submits → organizer accepts → QR email sent
- [ ] Check-in: organizer scans QR → participant checked in → dashboard updates
- [ ] Judging: submission portal opens → team submits → judge scores → leaderboard updates
- [ ] Finance: submit expense → admin approves → export CSV
- [ ] Reporting: event ends → report auto-assembles → PDF export downloads

## Acceptance Criteria
- [ ] All 5 paths covered with Playwright
- [ ] Tests run in CI on every PR
- [ ] Tests pass on staging environment
- [ ] Mobile viewport tested for check-in and judging paths (375px)
BODY
ci "[Sprint 6] E2E Test Suite (Playwright): Critical Paths" "E-00: Infrastructure,P0: Critical,type: chore,sprint: 6,points: 13" "Sprint 6 — Hardening & Beta Prep" "$TMPDIR/issue.md"

# ── Sprint 7: Integrations ──────────────────────────────────────────────

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an MLH-affiliated hackathon organizer, I want HackSuite to validate my MLH affiliation and share required event data automatically.

**Story Points:** 8

## Acceptance Criteria
- [ ] Org settings: MLH affiliation toggle with API key field
- [ ] On event creation: validate affiliation status with MLH API
- [ ] Share required event data (attendance count, dates, school) on event close
- [ ] MLH consent checkbox uses official MLH copy and version
- [ ] Integration documented in organizer onboarding
BODY
ci "[US-100] MLH API Integration" "E-10: Integrations,P2: Medium,type: user-story,sprint: 7,points: 8" "Sprint 7 — Beta Feedback & P2" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a participant, I want to add my check-in QR code to my phone Wallet app so I do not need to open my email on event day.

**Story Points:** 8

## Acceptance Criteria
- [ ] Acceptance email includes "Add to Apple Wallet" and "Add to Google Wallet" buttons
- [ ] Pass contains: event name, date, participant name, QR code
- [ ] Pass updates automatically if participant info changes before event
- [ ] Passes generated server-side — no third-party service storing participant PII
BODY
ci "[US-101] Google / Apple Wallet QR Pass" "E-10: Integrations,P2: Medium,type: user-story,sprint: 7,points: 8" "Sprint 7 — Beta Feedback & P2" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want HackSuite to send alerts to our Slack or Discord channel so the whole team stays informed.

**Story Points:** 5

## Acceptance Criteria
- [ ] Org settings: webhook URL field (Slack-compatible or Discord webhook)
- [ ] Configurable triggers: check-in milestones (25/50/75/100%), overdue sponsor deliverable, expense awaiting approval
- [ ] Message format: clear, actionable, includes event name and direct link
- [ ] Webhook failures logged; organizer notified if errors persist > 5 minutes
BODY
ci "[US-102] Slack / Discord Webhook Integration" "E-10: Integrations,P2: Medium,type: user-story,sprint: 7,points: 5" "Sprint 7 — Beta Feedback & P2" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As a university IT administrator, I want HackSuite to support SAML/OIDC so hackathon registration can be restricted to verified university students.

**Story Points:** 13

## Acceptance Criteria
- [ ] Per-org SSO configuration: upload SAML metadata or enter OIDC discovery URL
- [ ] Optional: restrict registration to SSO-authenticated users only (toggle)
- [ ] SSO login replaces email/password for org members; participants support optional SSO
- [ ] Tested with at least one real university IdP (Shibboleth or Azure AD)
- [ ] Fallback to email magic link if SSO unavailable
BODY
ci "[US-103] University SSO (SAML/OIDC)" "E-09: Auth,P2: Medium,type: user-story,sprint: 7,points: 13" "Sprint 7 — Beta Feedback & P2" "$TMPDIR/issue.md"

cat > "$TMPDIR/issue.md" << 'BODY'
## User Story
As an organizer, I want HackSuite to emit event triggers to Zapier or Make so I can build custom automations without code.

**Story Points:** 8

## Acceptance Criteria
- [ ] Supported triggers: new registration, participant status changed, project submitted, score submitted, expense submitted
- [ ] Trigger payload includes relevant entity data in JSON
- [ ] Zapier app listing or webhook endpoint for Make
- [ ] Retry logic on failed deliveries (3 retries with exponential backoff)
- [ ] Trigger log visible to org admins
BODY
ci "[US-104] Zapier / Make Integration (Event Triggers)" "E-10: Integrations,P2: Medium,type: user-story,sprint: 7,points: 8" "Sprint 7 — Beta Feedback & P2" "$TMPDIR/issue.md"

echo ""
echo "All issues created!"
