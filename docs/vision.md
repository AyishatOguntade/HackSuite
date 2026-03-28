# HackSuite — Product Vision Document

---

## Executive Summary

HackSuite is a purpose-built SaaS platform that gives university hackathon organizers a single operating system for their entire event — from opening registration to closing the books. Today's organizers lose hours every week reconciling data across five or more disconnected tools, and that friction compounds into real failures on event day. HackSuite eliminates that fragmentation by connecting registration, check-in, scheduling, judging, finance, marketing, sponsor management, and post-event reporting into one coherent product. It is designed for both MLH-affiliated and independent university hackathons, supports multi-organizer teams with role-based access, and is built mobile-first so it works as well on the venue floor as it does at a desk.

---

## Problem Statement

Running a university hackathon is a logistics-heavy operation managed almost entirely by volunteers who are also full-time students. The current toolchain looks like this:

| Task | Tool |
|---|---|
| Registrations | Google Forms + Sheets |
| Internal docs & runbooks | Notion |
| Project submissions | Devpost |
| Judging scores | Another spreadsheet |
| Sponsor tracking | Yet another spreadsheet or Airtable |
| Check-in | Paper lists or a hastily-built QR script |
| Budget & reimbursements | Email chains + university finance portal |
| Marketing | Manual posts across Instagram, email, Discord |
| Post-event recap | Copy-pasting from all of the above |

**Specific pain points:**

- **Data lives in silos.** A participant registered in Google Forms is a separate row in the check-in sheet, a different entry in Devpost, and possibly missing from the judging spreadsheet entirely. Keeping these in sync is manual, error-prone, and never fully done.
- **No single source of truth.** When a sponsor asks "how many attendees did you have?", the answer requires reconciling three different sheets.
- **Event-day chaos.** Check-in lines stall because the sheet is read-only on mobile, or the QR code script crashes, or two organizers are editing the same row simultaneously.
- **Financial blind spots.** Reimbursements get lost in email, budgets are tracked informally, and end-of-event accounting takes days of cleanup.
- **Marketing is an afterthought.** There is no system connecting registration numbers to outreach efforts — organizers cannot tell which channel drove signups.
- **Institutional knowledge dies.** When the organizing team graduates, the Notion docs, sheets, and Devpost account may go with them.

---

## Core Modules

### 1. Registration & Applications
The participant lifecycle starts here. Organizers build a custom application form with conditional logic (e.g., show team fields only if "I have a team" is selected), set acceptance criteria, and manage a waitlist automatically. Accepted participants receive confirmation emails with a unique QR code that flows directly into Check-in. Application data — dietary restrictions, T-shirt sizes, school, experience level — is normalized into a shared participant record used by every downstream module.

**Connects to:** Check-in (QR codes), Schedule (dietary/accommodation flags), Post-Event Reporting (demographics), Marketing (registration funnel metrics).

---

### 2. Check-in & Attendance
On event day, organizers scan participant QR codes from any mobile browser — no app install required. The dashboard shows real-time headcount, no-show rate, and flags participants with special accommodations. Late walk-in registrations can be created on the spot. Check-in data triggers automatic badge printing queues if integrated with a label printer. All attendance records are timestamped and exportable.

**Connects to:** Registration (pulls QR codes and participant records), Finance (attendance count for per-head budget calculations), Post-Event Reporting (final attendance figures).

---

### 3. Schedule & Logistics
An agenda builder where organizers create time blocks, assign rooms or virtual links, and publish a participant-facing schedule. Supports recurring workshop slots, mentor office hours, and meal breaks. Push notifications can be sent to all checked-in participants or targeted subgroups (e.g., "first-time hackers only"). Room capacity limits surface conflicts before they happen. Schedule changes propagate instantly to the participant-facing view.

**Connects to:** Check-in (only checked-in participants receive push notifications), Registration (dietary/meal flags surface in meal block planning), Judging (auto-populates judging time slots).

---

### 4. Project Submissions & Judging
Participants submit projects through a HackSuite-hosted portal — no Devpost dependency. Submissions include a title, description, demo link, repository, and track selection. Organizers assign judges to tracks, and the system balances workloads automatically to prevent any judge from reviewing too many or too few projects. Judges score on configurable rubrics from their phone. A live leaderboard (visible to organizers only, or made public) updates in real time. Tie-breaking rules are set in advance.

**Connects to:** Registration (team/participant records), Schedule (judging time slot integration), Sponsor Management (sponsor-specific prize tracks), Post-Event Reporting (winning projects, judge feedback export).

---

### 5. Sponsor Management
A CRM layer for sponsor relationships. Each sponsor has a profile with their tier, point of contact, logo assets, and a deliverable checklist (e.g., "logo on website ✓", "table at venue ✗", "social shoutout ✗"). Organizers get a unified view of what is owed to each sponsor and what is overdue. After the event, one click generates a sponsor recap report with attendance stats, demographic highlights, and photos — ready to send without any manual assembly.

**Connects to:** Finance (sponsor payment tracking and reconciliation), Marketing (sponsor logo library for promotional assets), Post-Event Reporting (sponsor-specific metrics).

---

### 6. Finance & Budgeting
A purpose-built budget tracker for student-run events that often operate with university funding, MLH grants, and sponsor income simultaneously. Organizers create a budget with line items (catering, swag, venue, prizes), track actual expenses against projections, and submit reimbursement requests with receipt uploads directly in the platform. Sponsor payments are reconciled against expected amounts. At close, a clean financial summary exports in a format accepted by most university accounting offices.

**Connects to:** Sponsor Management (maps sponsor commitments to received payments), Registration (per-head costs scale with confirmed attendance), Post-Event Reporting (budget vs. actual included in recap).

---

### 7. Marketing & Outreach
A lightweight campaign hub so organizers can run coordinated outreach without juggling Mailchimp, Canva, and a Google Doc of Instagram captions simultaneously. Features include: an email campaign builder with pre-built hackathon templates, social media copy generation scoped to the event's theme and dates, a customizable registration landing page hosted on a HackSuite subdomain, and a referral tracking link generator. A hype metrics dashboard shows registration growth over time, traffic sources, and conversion rate from landing page visit to completed application — closing the loop between marketing effort and registration outcomes.

**Connects to:** Registration (tracks which campaigns drove signups), Sponsor Management (pulls sponsor logos and assets into marketing templates), Post-Event Reporting (marketing funnel metrics included in recap).

---

### 8. Post-Event Reporting
After the event closes, HackSuite auto-assembles a recap from data already in the system: final attendance, demographic breakdown, project submission count, judging results, budget vs. actual spend, and top marketing channels. Organizers can add a written summary and photos, then export the report as a polished PDF. Two versions are generated automatically: an internal version (for the organizing team and university administration) and a sponsor-facing version (highlights relevant to their investment). This report also serves as the institutional handoff document for the next year's organizing team.

**Connects to:** All modules (aggregates data from every stage of the event lifecycle).

---

## 10x Moments

These are the specific scenarios where HackSuite prevents a failure that organizers have actually experienced:

**1. The double-booked judge problem.**
In a spreadsheet-based system, two organizers assign the same judge to overlapping tracks because they are editing different tabs. On judging day, the judge either skips projects or the whole schedule slips. HackSuite's judging module enforces conflict-free assignments in real time and alerts organizers before the issue becomes a day-of crisis.

**2. The check-in line collapse.**
A read-only Google Sheet on mobile, combined with spotty venue WiFi, causes check-in to stall for 20 minutes while 200 people queue at the door. HackSuite's check-in is built for exactly this environment — offline-capable, optimized for one-handed mobile use, and never dependent on a shared spreadsheet that locks under concurrent edits.

**3. The missing sponsor deliverable.**
A sponsor paid for a table, a social post, and a logo placement. The social post never went out because it was buried in a Slack thread. Post-event, the sponsor notices. HackSuite's sponsor checklist surfaces every overdue deliverable before the event ends, and the auto-generated recap proves what was delivered — protecting the relationship and making renewal easier.

---

## Competitive Positioning

| | HackSuite | Devpost | HackDash | Google Sheets + Notion |
|---|---|---|---|---|
| Full lifecycle coverage | Yes | Submissions/judging only | Partial | No (requires many tools) |
| Mobile-first organizer UI | Yes | No | Partial | No |
| Sponsor management | Yes | No | No | Manual |
| Finance & budgeting | Yes | No | No | Manual |
| Marketing & outreach | Yes | No | No | Manual |
| Multi-organizer roles | Yes | Limited | Yes | No |
| MLH compatibility | Yes | Yes | Unknown | Yes |
| Post-event sponsor report | Auto-generated | No | No | Manual |
| Institutional handoff | Built-in | No | No | Export and pray |

**Devpost** is submission-and-judging software, not event management software. It solves one module well and ignores the rest. **HackDash** covers some logistics but lacks finance, marketing, and sponsor management depth. The **duct-tape stack** is infinitely flexible but creates the exact fragmentation HackSuite is built to eliminate.

HackSuite's defensible advantage is not any single feature — it is the data model. Every participant is one record, not five. Every event metric is computed from live data, not assembled by hand. That coherence compounds across every module.

---

## Why Now

Three trends make this the right moment to build HackSuite:

**1. The hackathon market has matured.** There are now thousands of university hackathons annually, many running 500–2,000 participants. Events at this scale feel the toolchain pain acutely — the duct-tape approach that worked for 100 attendees breaks visibly at 1,000.

**2. MLH and similar organizations have raised the bar.** Affiliation requirements around check-in accuracy, code of conduct enforcement, and post-event reporting have made "good enough" spreadsheet tracking a liability. Organizers need systems that produce auditable records, not approximations.

**3. No one has built the full stack.** Devpost owns submissions. A few indie tools handle check-in. Nothing connects them. The gap between what organizers need and what exists is wide, obvious, and unaddressed — not because the problem is unsolved, but because no one has treated it as a single coherent product opportunity.

HackSuite is that product.
