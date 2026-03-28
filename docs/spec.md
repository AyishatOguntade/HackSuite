# HackSuite — Software Engineering Specification

**Version:** 1.0
**Date:** 2026-03-28
**Status:** Draft

---


## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Module Specifications](#4-module-specifications)
5. [API Design](#5-api-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Integrations](#8-integrations)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Security Requirements](#10-security-requirements)

---

## 1. System Overview

### 1.1 Purpose
HackSuite is a multi-tenant SaaS platform for university hackathon organizers. It manages the full event lifecycle across eight functional modules: Registration, Check-in, Schedule, Judging, Sponsor Management, Finance, Marketing, and Post-Event Reporting.

### 1.2 Users

| Role | Description |
|---|---|
| `owner` | Creates the organization account; full permissions |
| `admin` | Full event management access; cannot delete the organization |
| `organizer` | Module-scoped access (e.g., logistics-only, finance-only) |
| `judge` | Access limited to the judging portal for assigned tracks |
| `sponsor` | Read-only access to their sponsor profile and deliverable status |
| `participant` | Registers, checks in, submits projects, views schedule |

### 1.3 Tenancy Model
Each hackathon organization is a **tenant**. A tenant maps to one university club or team and can run multiple events over time. All data is tenant-scoped. An event belongs to exactly one tenant. Users belong to a tenant and are assigned roles per event.

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│   Web App (React)        Mobile Browser (PWA)        │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────┐
│                    API Gateway                       │
│         Rate limiting, Auth, Request routing         │
└──┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼──┐  ┌────▼───┐  ┌──▼──────┐
│Auth │  │Core  │  │Realtime│  │File     │
│Svc  │  │API   │  │Service │  │Storage  │
└──┬──┘  └───┬──┘  └────┬───┘  └──┬──────┘
   │          │          │         │
┌──▼──────────▼──────────▼─────────▼──────┐
│              PostgreSQL (primary)        │
│         Redis (cache + pub/sub)          │
│         S3-compatible object store       │
└─────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 19, TypeScript, TailwindCSS | Component reuse across web and PWA |
| PWA | Workbox (service worker), IndexedDB | Offline check-in support |
| Backend | Node.js (Fastify) or Python (FastAPI) | REST + WebSocket on one runtime |
| Database | PostgreSQL 16 | Multi-tenant RLS, JSONB for flexible form fields |
| Cache / Pub-Sub | Redis 7 | Session store, real-time leaderboard, push events |
| File Storage | S3-compatible (AWS S3 or Cloudflare R2) | Receipts, logos, report exports |
| Auth | Auth0 or Supabase Auth | SSO, university email domain restrictions |
| Email | Resend or AWS SES | Transactional + campaign emails |
| PDF Export | Puppeteer (headless Chrome) | Pixel-accurate sponsor report rendering |
| Background Jobs | BullMQ (Redis-backed) | Email sends, report generation, PDF rendering |

### 2.3 Frontend Architecture

- **Single SPA** with route-based code splitting per module
- **Optimistic UI** for check-in scans (assume success, reconcile on sync)
- **Offline mode** (PWA): check-in module queues scans to IndexedDB when offline; syncs on reconnect
- Shared component library used across organizer dashboard and participant-facing pages

---

## 3. Data Model

### 3.1 Core Entities

```
Organization
  id, name, slug, created_at
  └── Events (1:many)
        id, org_id, name, slug, start_date, end_date, status
        └── Participants (1:many)   — normalized record, one per person per event
        └── Judges (1:many)
        └── Sponsors (1:many)
        └── ScheduleBlocks (1:many)
        └── Tracks (1:many)        — judging/prize tracks
        └── BudgetItems (1:many)
        └── Campaigns (1:many)

OrganizationMembers
  org_id, user_id, role (owner | admin | organizer)

EventPermissions
  event_id, user_id, scoped_role, module_access[] — e.g. ['checkin','finance']
```

### 3.2 Participant Record

```sql
participants (
  id UUID PK,
  event_id UUID FK,
  user_id UUID FK NULLABLE,       -- null until they create an account
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  school TEXT,
  status TEXT CHECK (status IN ('applied','waitlisted','accepted','confirmed','checked_in','no_show')),
  form_responses JSONB,           -- flexible: dietary, shirt size, experience, etc.
  qr_code TEXT UNIQUE,            -- generated on acceptance
  checked_in_at TIMESTAMPTZ,
  team_id UUID FK NULLABLE,
  created_at TIMESTAMPTZ
)
```

### 3.3 Key Relationships

```
participants ──< team_members >── teams
teams ──< project_submissions
project_submissions ──< submission_scores >── judges
judges ──< judge_track_assignments >── tracks
sponsors ──< sponsor_deliverables
budget_items ── expenses ──< reimbursement_requests
campaigns ──< campaign_links    -- UTM-tracked referral links
```

### 3.4 Row-Level Security Strategy
All tables include `event_id` and/or `org_id`. PostgreSQL RLS policies enforce tenant isolation at the database layer. Application layer also validates tenant context on every request. Judges can only read submissions assigned to their tracks. Sponsors can only read their own profile row.

---

## 4. Module Specifications

---

### 4.1 Registration & Applications

**Functional Requirements**

| ID | Requirement |
|---|---|
| REG-01 | Organizers can create a custom application form with field types: text, textarea, select, multi-select, checkbox, file upload, conditional display |
| REG-02 | Form submissions are stored as JSONB on the participant record |
| REG-03 | Organizers set acceptance mode: manual review or automatic (first N applicants) |
| REG-04 | Waitlist management: auto-promote from waitlist when confirmed spots open |
| REG-05 | On acceptance, system emails participant with confirmation and unique QR code (SVG, scannable at 200px) |
| REG-06 | Participants can update their profile until a configurable lock date |
| REG-07 | Organizers can bulk-accept, bulk-reject, or bulk-email filtered participant segments |
| REG-08 | Registration page is hosted at `{event-slug}.hacksuite.app` and is customizable (logo, colors, cover image) |
| REG-09 | RSVP deadline enforcement with automatic waitlist promotion after deadline |
| REG-10 | MLH data sharing consent checkbox supported as a required field type |

**State Machine: Participant Status**
```
applied → waitlisted → accepted → confirmed → checked_in
                    ↘ rejected          ↘ no_show
```

**Endpoints**
```
POST   /events/:id/applications          -- submit application (public)
GET    /events/:id/participants          -- list participants (organizer)
PATCH  /events/:id/participants/:pid     -- update status (organizer)
POST   /events/:id/participants/bulk     -- bulk status update
GET    /events/:id/participants/:pid/qr  -- fetch QR code
```

---

### 4.2 Check-in & Attendance

**Functional Requirements**

| ID | Requirement |
|---|---|
| CHK-01 | Any organizer can scan a QR code from a mobile browser camera — no native app required |
| CHK-02 | Scan result returns within 300ms on a 3G connection |
| CHK-03 | Offline mode: scans queued in IndexedDB, synced on reconnect with conflict resolution (last-write-wins, flagged for review if same QR scanned twice) |
| CHK-04 | Live dashboard: total checked in, no-shows, accommodations count — updates via WebSocket |
| CHK-05 | Walk-in registration: organizer can create a participant record on the spot and generate a QR on-screen |
| CHK-06 | Participant accommodation flags (dietary, accessibility) surface on scan confirmation screen |
| CHK-07 | Badge print queue: successful scan optionally triggers print job to a connected label printer via Print API |
| CHK-08 | All check-in events are timestamped and immutable (append-only log) |

**Offline Sync Protocol**
1. On scan: write to IndexedDB queue with `{qr_code, scanned_at, device_id, synced: false}`
2. On reconnect: POST `/events/:id/checkin/sync` with queued batch
3. Server deduplicates by `qr_code + event_id`; returns conflicts array
4. Client clears synced entries; flags conflicts in UI

**Endpoints**
```
POST   /events/:id/checkin              -- single scan
POST   /events/:id/checkin/sync         -- batch offline sync
GET    /events/:id/checkin/stats        -- live stats (also via WS)
POST   /events/:id/checkin/walkin       -- create + check in new participant
WS     /events/:id/checkin/stream       -- real-time dashboard feed
```

---

### 4.3 Schedule & Logistics

**Functional Requirements**

| ID | Requirement |
|---|---|
| SCH-01 | Organizers create time blocks with: title, type (workshop/meal/judging/ceremony), start, end, location (room name or URL), capacity |
| SCH-02 | Conflict detection: warn if two blocks share a room and time overlap |
| SCH-03 | Published schedule is viewable by participants at `{event-slug}.hacksuite.app/schedule` |
| SCH-04 | Push notifications sent via Web Push API to checked-in participants who have granted permission |
| SCH-05 | Notifications can be targeted: all, checked-in only, by track, by dietary flag |
| SCH-06 | Schedule changes (edits, additions, deletions) are broadcast via WebSocket to open participant schedule views |
| SCH-07 | Judging time blocks auto-populate from the judging module's assigned slots |
| SCH-08 | Meal blocks surface participant dietary count from the participant records |

**Endpoints**
```
GET    /events/:id/schedule             -- full schedule (public once published)
POST   /events/:id/schedule/blocks      -- create block
PATCH  /events/:id/schedule/blocks/:bid -- update block
DELETE /events/:id/schedule/blocks/:bid -- delete block
POST   /events/:id/schedule/notify      -- send push notification
```

---

### 4.4 Project Submissions & Judging

**Functional Requirements**

| ID | Requirement |
|---|---|
| JDG-01 | Submission portal opens/closes on organizer-configured timestamps |
| JDG-02 | Submission fields: title, description (markdown), demo URL, repo URL, track (multi-select), team members (auto-filled from team), optional file attachment |
| JDG-03 | One submission per team; team members can all edit until close |
| JDG-04 | Organizers assign judges to tracks; system flags if any judge is double-booked across overlapping schedule slots |
| JDG-05 | Judging rubric is configurable per track: up to 8 criteria, each with a label, description, and max score |
| JDG-06 | Each judge scores each assigned submission independently; scores are hidden from other judges |
| JDG-07 | Final score = weighted average across rubric criteria; tie-breaking rule (random or secondary criterion) set at event level |
| JDG-08 | Live leaderboard per track: organizer-visible always; participant-visible if enabled |
| JDG-09 | Judges access their queue via a mobile-optimized portal requiring only their email (magic link auth) |
| JDG-10 | Organizers can export all scores as CSV |

**Score Calculation**
```
submission_score = Σ (criterion_weight[i] * judge_score[i]) / Σ criterion_weight[i]
track_score = average of all judge submission_scores for that submission in that track
```

**Endpoints**
```
POST   /events/:id/submissions               -- submit project (participant)
PATCH  /events/:id/submissions/:sid          -- edit submission
GET    /events/:id/submissions               -- list all (organizer)
GET    /events/:id/tracks/:tid/submissions   -- judge's queue
POST   /events/:id/scores                    -- submit score (judge)
GET    /events/:id/leaderboard/:tid          -- track leaderboard
GET    /events/:id/scores/export             -- CSV export
```

---

### 4.5 Sponsor Management

**Functional Requirements**

| ID | Requirement |
|---|---|
| SPO-01 | Each sponsor has a profile: name, tier, point of contact (name + email), logo (upload), description |
| SPO-02 | Tiers are organizer-defined (e.g., Gold/Silver/Bronze or Title/Major/Minor) with configurable benefit templates |
| SPO-03 | Deliverable checklist per sponsor: organizers create deliverables, mark completion, attach evidence (link or file) |
| SPO-04 | Overdue deliverables (past due date, uncompleted) surface as alerts on the organizer dashboard |
| SPO-05 | Sponsors can be granted a login to view their own profile, deliverable status, and post-event metrics |
| SPO-06 | One-click sponsor recap: PDF report per sponsor with event metrics relevant to their tier |
| SPO-07 | Logo assets stored in S3; accessible to the Marketing module |
| SPO-08 | Sponsor payment status tracked (expected amount, received amount, payment date) |

**Endpoints**
```
POST   /events/:id/sponsors              -- create sponsor
PATCH  /events/:id/sponsors/:sid         -- update sponsor
GET    /events/:id/sponsors              -- list sponsors (organizer)
POST   /events/:id/sponsors/:sid/deliverables     -- add deliverable
PATCH  /events/:id/sponsors/:sid/deliverables/:did -- update deliverable
GET    /events/:id/sponsors/:sid/report  -- generate recap PDF
```

---

### 4.6 Finance & Budgeting

**Functional Requirements**

| ID | Requirement |
|---|---|
| FIN-01 | Organizers create a budget with line items: category, description, estimated amount, actual amount |
| FIN-02 | Income sources tracked separately: university funding, MLH grant, sponsor payments (pulled from Sponsor module) |
| FIN-03 | Expense submission: any organizer submits an expense with amount, category, description, receipt upload (image or PDF) |
| FIN-04 | Reimbursement workflow: submitted → approved → paid; approvals require `admin` or `owner` role |
| FIN-05 | Budget overview shows: total income, total estimated spend, total actual spend, remaining balance |
| FIN-06 | Sponsor payments from the Sponsor module auto-create income entries in Finance |
| FIN-07 | Export: CSV and PDF summary export formatted for university accounting submission |
| FIN-08 | Per-head cost calculation: total actual spend / confirmed attendance (pulled from Check-in) |

**Endpoints**
```
GET    /events/:id/budget                -- budget overview
POST   /events/:id/budget/items          -- create line item
POST   /events/:id/expenses              -- submit expense
PATCH  /events/:id/expenses/:eid         -- update expense (status, approval)
GET    /events/:id/expenses              -- list expenses
GET    /events/:id/budget/export         -- CSV/PDF export
```

---

### 4.7 Marketing & Outreach

**Functional Requirements**

| ID | Requirement |
|---|---|
| MKT-01 | Email campaign builder: organizers compose emails using a block editor with pre-built hackathon templates |
| MKT-02 | Recipient targeting: all registrants, accepted only, waitlisted, custom segment by form response filter |
| MKT-03 | Campaigns have a scheduled send time or are sent immediately |
| MKT-04 | Campaign metrics: sent, delivered, opened, clicked — updated via email provider webhooks |
| MKT-05 | Referral link generator: creates a UTM-tagged URL per channel (e.g., Instagram bio, Discord, flyer QR) |
| MKT-06 | Hype dashboard: registration growth chart (by day), breakdown by referral source, conversion rate (page view → submitted application) |
| MKT-07 | Registration landing page: organizer-customizable via a settings panel (logo, colors, hero text, cover image, social links) — no code required |
| MKT-08 | Social copy generator: given event name, dates, theme, and target audience, produces draft captions for Twitter/X, Instagram, LinkedIn, Discord |
| MKT-09 | Sponsor logos pulled from Sponsor module asset library for use in email templates |

**Endpoints**
```
POST   /events/:id/campaigns             -- create campaign
POST   /events/:id/campaigns/:cid/send   -- send or schedule
GET    /events/:id/campaigns/:cid/stats  -- campaign metrics
POST   /events/:id/campaigns/links       -- generate referral link
GET    /events/:id/campaigns/dashboard   -- hype metrics
PATCH  /events/:id/landing-page          -- update landing page settings
GET    /events/:id/landing-page          -- public landing page data
```

---

### 4.8 Post-Event Reporting

**Functional Requirements**

| ID | Requirement |
|---|---|
| RPT-01 | Report is auto-assembled from live data after event end date passes |
| RPT-02 | Internal report sections: attendance summary, demographics, schedule recap, project/judging results, budget vs. actual, top marketing channels |
| RPT-03 | Sponsor report sections: attendance count, demographic highlights (opt-in data only), prize track winners, sponsor deliverable completion status |
| RPT-04 | Organizer can add a written summary and upload up to 20 photos |
| RPT-05 | Export to PDF via headless browser rendering; download or share via a private link with optional password |
| RPT-06 | Report data is snapshotted at export time (immutable copy) |
| RPT-07 | Report serves as institutional handoff: shareable with next year's organizing team via org-scoped link |

**Endpoints**
```
GET    /events/:id/report                -- get report data
PATCH  /events/:id/report                -- add summary/photos
POST   /events/:id/report/export         -- trigger PDF export job
GET    /events/:id/report/export/:job_id -- poll export status + download URL
POST   /events/:id/report/share          -- generate share link
```

---

## 5. API Design

### 5.1 Conventions

- **Base URL:** `https://api.hacksuite.app/v1`
- **Format:** JSON over HTTPS
- **Auth:** Bearer token (JWT) in `Authorization` header
- **Tenant context:** Resolved from JWT claims (`org_id`, `event_id` scope)
- **Pagination:** Cursor-based using `?after=<cursor>&limit=<n>` (default limit: 50, max: 200)
- **Errors:** RFC 7807 Problem Details format

```json
{
  "type": "https://api.hacksuite.app/errors/not-found",
  "title": "Participant not found",
  "status": 404,
  "detail": "No participant with id abc123 exists in this event.",
  "instance": "/events/xyz/participants/abc123"
}
```

### 5.2 Versioning
URL-based versioning (`/v1/`). Breaking changes increment the major version. Deprecated versions sunset after 12 months with prior notice.

### 5.3 Rate Limiting
- Standard: 500 req/min per org token
- Check-in scan endpoint: 120 req/min per device (burst-tolerant)
- Email send endpoint: 10 req/min per event

### 5.4 WebSocket Events

| Channel | Event | Payload |
|---|---|---|
| `checkin:stats` | `stat_update` | `{ checked_in, total, no_shows }` |
| `schedule:updates` | `block_updated` | Full schedule block object |
| `judging:leaderboard` | `score_update` | `{ track_id, submission_id, new_rank }` |
| `notifications:push` | `notification_sent` | `{ title, body, target_count }` |

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

1. User signs in via OAuth (Google, GitHub) or email magic link through Auth0/Supabase
2. JWT issued with claims: `user_id`, `org_id`, `roles[]`, `event_permissions{}`
3. JWT validated on every API request; short-lived (15 min) with refresh token rotation
4. Judge magic links are single-use, time-scoped (valid for event duration), and do not create full user accounts

### 6.2 University SSO
Optional SAML/OIDC integration per organization for university email domain enforcement (e.g., only `@uri.edu` emails can register).

### 6.3 Permission Matrix

| Action | owner | admin | organizer (scoped) | judge | sponsor | participant |
|---|---|---|---|---|---|---|
| Manage org settings | ✓ | — | — | — | — | — |
| Create/delete event | ✓ | ✓ | — | — | — | — |
| Manage participants | ✓ | ✓ | if `registration` | — | — | — |
| Run check-in | ✓ | ✓ | if `checkin` | — | — | — |
| Manage budget | ✓ | ✓ | if `finance` | — | — | — |
| Approve reimbursements | ✓ | ✓ | — | — | — | — |
| Score submissions | — | — | — | ✓ | — | — |
| View own sponsor profile | — | — | — | — | ✓ | — |
| Submit application | — | — | — | — | — | ✓ |
| Submit project | — | — | — | — | — | ✓ |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|---|---|
| QR scan response time (p99) | < 300ms |
| Page load (initial, 3G) | < 3s (LCP) |
| API response time (p95) | < 200ms |
| WebSocket event delivery | < 500ms |
| PDF report generation | < 30s (async job) |
| Real-time leaderboard update | < 1s after score submitted |

### 7.2 Availability
- **Uptime SLA:** 99.9% (excluding scheduled maintenance)
- **Event-day guarantee:** No deployments within 12 hours of an event's start time; rollback procedure documented
- **Maintenance windows:** Sundays 02:00–04:00 UTC

### 7.3 Scalability
- Horizontal scaling for API servers (stateless, load-balanced)
- Check-in module designed for 1,000 simultaneous scans without degradation
- Database read replicas for reporting queries

### 7.4 Offline Capability
- Check-in module: full offline support via PWA (IndexedDB queue, sync on reconnect)
- Schedule view: cached for offline read after first load
- All other modules: graceful degradation with clear "you are offline" indicators

### 7.5 Accessibility
- WCAG 2.1 AA compliance for all participant-facing pages
- Organizer dashboard: keyboard navigable, screen reader compatible for primary flows

---

## 8. Integrations

| Integration | Purpose | Module |
|---|---|---|
| MLH API | Validate MLH affiliation, share required event data | Registration |
| Devpost (import) | One-time project import for orgs transitioning off Devpost | Judging |
| Slack / Discord webhook | Push notifications to organizer channels (check-in alerts, overdue deliverables) | Check-in, Sponsor |
| Zapier / Make | Generic event triggers for custom automation | All |
| Google / Apple Wallet | Add QR code to mobile wallet | Registration |
| Label printer (DYMO/Zebra) | Badge print on check-in | Check-in |
| University SSO (SAML/OIDC) | Restrict registration to university email domains | Auth |
| Stripe (future) | Paid hackathon registration or swag store | Finance |

---

## 9. Infrastructure & Deployment

### 9.1 Environments

| Environment | Purpose |
|---|---|
| `production` | Live, tenant-facing |
| `staging` | Pre-release validation; mirrors production config |
| `preview` | Per-PR ephemeral deployments for frontend |
| `development` | Local Docker Compose stack |

### 9.2 CI/CD Pipeline

```
push → lint + typecheck → unit tests → integration tests (real DB)
     → build Docker image → push to registry
     → deploy to staging → smoke tests
     → manual gate → deploy to production
```

### 9.3 Local Development
```bash
# Start full stack locally
docker compose up

# Services exposed:
# - API:      http://localhost:3000
# - Web app:  http://localhost:5173
# - Postgres: localhost:5432
# - Redis:    localhost:6379
# - Mailhog:  http://localhost:8025 (email preview)
```

### 9.4 Database Migrations
- Schema migrations managed with `golang-migrate` or `Flyway`
- Migrations run automatically on deploy; must be backwards-compatible (expand/contract pattern)
- No destructive migrations on production without a 2-week deprecation window

---

## 10. Security Requirements

| Requirement | Detail |
|---|---|
| Tenant isolation | RLS enforced at DB layer; every query scoped by `org_id` or `event_id` |
| Input validation | All inputs validated server-side; parameterized queries only (no raw SQL interpolation) |
| File uploads | Type validation (allowlist), virus scan (ClamAV or cloud equivalent), stored in private S3 bucket with signed URLs |
| PII handling | Participant PII (email, dietary info) encrypted at rest; exportable/deletable per GDPR/FERPA request |
| Secrets management | No secrets in code or environment files; stored in AWS Secrets Manager or equivalent |
| Audit log | Immutable log of all `status` changes on participants, expenses, and deliverables (who, what, when) |
| HTTPS | TLS 1.2+ enforced; HSTS preloaded |
| Dependency scanning | Automated CVE scanning on every build (Dependabot or Snyk) |
| Penetration testing | Annual third-party pentest; critical findings addressed before next event season |
| Data retention | Event data retained 3 years by default; org owner can request deletion |
