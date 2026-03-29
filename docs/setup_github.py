#!/usr/bin/env python3
"""
HackSuite GitHub Setup Script
Creates the GitHub repo, labels, milestones, and all issues from backlog.md

Usage:
    python docs/setup_github.py --token <your_github_pat> --username <your_github_username>

Generate a token at: https://github.com/settings/tokens
Required scopes: repo (full)
"""

import argparse
import json
import time
import urllib.request
import urllib.error

BASE = "https://api.github.com"
REPO_NAME = "HackSuite"


def api(method, path, token, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR {e.code} on {method} {path}: {body[:200]}")
        return None, e.code


def create_repo(token, username):
    print(f"\n[1/5] Creating repo '{REPO_NAME}'...")
    data, status = api("POST", "/user/repos", token, {
        "name": REPO_NAME,
        "description": "Purpose-built SaaS platform for university hackathon organizers",
        "private": False,
        "has_issues": True,
        "has_projects": True,
        "has_wiki": False,
        "auto_init": False,
    })
    if data:
        print(f"  Created: {data['html_url']}")
        return data["full_name"]
    elif status == 422:
        print(f"  Repo already exists — using {username}/{REPO_NAME}")
        return f"{username}/{REPO_NAME}"
    return None


def create_labels(token, repo):
    print("\n[2/5] Creating labels...")
    labels = [
        # Epics
        {"name": "E-00: Infrastructure",     "color": "1f1f1f", "description": "Foundation & infrastructure"},
        {"name": "E-01: Registration",        "color": "0075ca", "description": "Registration & Applications"},
        {"name": "E-02: Check-in",            "color": "0075ca", "description": "Check-in & Attendance"},
        {"name": "E-03: Schedule",            "color": "0075ca", "description": "Schedule & Logistics"},
        {"name": "E-04: Judging",             "color": "0075ca", "description": "Project Submissions & Judging"},
        {"name": "E-05: Sponsors",            "color": "0075ca", "description": "Sponsor Management"},
        {"name": "E-06: Finance",             "color": "0075ca", "description": "Finance & Budgeting"},
        {"name": "E-07: Marketing",           "color": "0075ca", "description": "Marketing & Outreach"},
        {"name": "E-08: Reporting",           "color": "0075ca", "description": "Post-Event Reporting"},
        {"name": "E-09: Auth",                "color": "0075ca", "description": "Multi-Tenancy & Auth"},
        {"name": "E-10: Integrations",        "color": "0075ca", "description": "Integrations & Extensibility"},
        # Priority
        {"name": "P0: Critical",              "color": "d73a4a", "description": "Must ship for MVP"},
        {"name": "P1: High",                  "color": "e4e669", "description": "High priority"},
        {"name": "P2: Medium",                "color": "a2eeef", "description": "Medium priority"},
        # Type
        {"name": "type: user-story",          "color": "7057ff", "description": "User story"},
        {"name": "type: infrastructure",      "color": "6f42c1", "description": "Infrastructure / DevOps task"},
        {"name": "type: bug",                 "color": "d73a4a", "description": "Bug"},
        {"name": "type: chore",               "color": "cccccc", "description": "Chore / maintenance"},
        # Sprint
        {"name": "sprint: 0",  "color": "bfd4f2", "description": "Sprint 0 — Foundation"},
        {"name": "sprint: 1",  "color": "bfd4f2", "description": "Sprint 1 — Registration"},
        {"name": "sprint: 2",  "color": "bfd4f2", "description": "Sprint 2 — Check-in & Schedule"},
        {"name": "sprint: 3",  "color": "bfd4f2", "description": "Sprint 3 — Judging & Submissions"},
        {"name": "sprint: 4",  "color": "bfd4f2", "description": "Sprint 4 — Sponsors & Finance"},
        {"name": "sprint: 5",  "color": "bfd4f2", "description": "Sprint 5 — Marketing & Reporting"},
        {"name": "sprint: 6",  "color": "bfd4f2", "description": "Sprint 6 — Hardening & Beta Prep"},
        {"name": "sprint: 7",  "color": "bfd4f2", "description": "Sprint 7 — Beta Feedback & P2"},
        # Effort
        {"name": "points: 3",  "color": "f9d0c4", "description": "3 story points"},
        {"name": "points: 5",  "color": "f9d0c4", "description": "5 story points"},
        {"name": "points: 8",  "color": "f9d0c4", "description": "8 story points"},
        {"name": "points: 13", "color": "f9d0c4", "description": "13 story points"},
        {"name": "points: 21", "color": "f9d0c4", "description": "21 story points"},
    ]
    for label in labels:
        _, status = api("POST", f"/repos/{repo}/labels", token, label)
        mark = "+" if status == 201 else ("~" if status == 422 else "!")
        print(f"  [{mark}] {label['name']}")
        time.sleep(0.1)


def create_milestones(token, repo):
    print("\n[3/5] Creating sprint milestones...")
    milestones = [
        {"title": "Sprint 0 — Foundation",              "description": "Weeks 1–2: Monorepo, CI/CD, auth, schema"},
        {"title": "Sprint 1 — Registration",            "description": "Weeks 3–4: Forms, QR, email, landing page"},
        {"title": "Sprint 2 — Check-in & Schedule",     "description": "Weeks 5–6: QR scanner, offline mode, agenda"},
        {"title": "Sprint 3 — Judging & Submissions",   "description": "Weeks 7–8: Submission portal, scoring, leaderboard"},
        {"title": "Sprint 4 — Sponsors & Finance",      "description": "Weeks 9–10: Sponsor profiles, budget, expenses"},
        {"title": "Sprint 5 — Marketing & Reporting",   "description": "Weeks 11–12: Campaigns, referral links, post-event report"},
        {"title": "Sprint 6 — Hardening & Beta Prep",   "description": "Weeks 13–14: Load testing, a11y, security, E2E tests"},
        {"title": "Sprint 7 — Beta Feedback & P2",      "description": "Weeks 15–16: MLH, Wallet, SSO, Zapier, beta fixes"},
    ]
    milestone_map = {}
    for ms in milestones:
        data, status = api("POST", f"/repos/{repo}/milestones", token, ms)
        if data:
            milestone_map[ms["title"]] = data["number"]
            print(f"  [+] #{data['number']} {ms['title']}")
        elif status == 422:
            print(f"  [~] Already exists: {ms['title']}")
        time.sleep(0.1)
    return milestone_map


def create_issues(token, repo, milestones):
    print("\n[4/5] Creating issues...")

    sprint = lambda n: f"Sprint {n} —"
    ms = lambda title_fragment: next(
        (num for t, num in milestones.items() if title_fragment in t), None
    )

    issues = [
        # ── SPRINT 0 ── FOUNDATION ──────────────────────────────────────────
        {
            "title": "[US-001] Monorepo & Project Scaffolding",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: infrastructure", "sprint: 0", "points: 8"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As the tech lead, I want a monorepo with clearly separated packages for `api`, `web`, `workers`, and `shared`, so that the team can develop, test, and deploy each layer independently without coupling.

**Story Points:** 8

## Acceptance Criteria
- [ ] Monorepo initialized (Turborepo or Nx) with `apps/api`, `apps/web`, `packages/shared`
- [ ] TypeScript configured end-to-end with strict mode
- [ ] Shared types package importable by both api and web
- [ ] `pnpm install` from root installs all workspaces
- [ ] `pnpm dev` starts API (port 3000) and web (port 5173) concurrently

## Tests
- `T-001-1`: Run `pnpm install` from root — exits 0, no errors
- `T-001-2`: Run `pnpm dev` — both API and web start; http://localhost:3000/health returns 200
- `T-001-3`: Import a type from `@hacksuite/shared` in both api and web — TypeScript compiles without error
- `T-001-4`: Run `pnpm typecheck` from root — exits 0""",
        },
        {
            "title": "[US-002] Docker Compose Local Environment",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: infrastructure", "sprint: 0", "points: 5"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As any engineer, I want a single `docker compose up` command to start the full local stack, so that onboarding takes minutes and environment drift between engineers is eliminated.

**Story Points:** 5

## Acceptance Criteria
- [ ] Compose file starts: PostgreSQL 16, Redis 7, API, Web, Mailhog
- [ ] Database initializes with seed schema on first run
- [ ] Volumes persist data between restarts; `docker compose down -v` resets cleanly
- [ ] `.env.example` documents every required environment variable
- [ ] README documents local setup in ≤ 5 steps

## Tests
- `T-002-1`: Clone repo on a fresh machine, run `docker compose up` — all services healthy within 60s
- `T-002-2`: Send POST /health to API — returns `{ status: "ok", db: "connected", redis: "connected" }`
- `T-002-3`: Stop and restart containers — previously seeded data persists
- `T-002-4`: Run `docker compose down -v && docker compose up` — clean state, no migration errors""",
        },
        {
            "title": "[US-003] CI/CD Pipeline",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: infrastructure", "sprint: 0", "points: 8"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As the team, I want an automated pipeline that runs tests, builds images, and deploys to staging on merge to main, so that broken code never reaches staging and deployments are repeatable.

**Story Points:** 8

## Acceptance Criteria
- [ ] GitHub Actions pipeline: lint → typecheck → unit tests → integration tests → build → push image → deploy staging
- [ ] Integration tests run against a real PostgreSQL instance (not mocks)
- [ ] Build fails fast: lint/typecheck failures block before running slower tests
- [ ] Staging deploy is automatic on merge to `main`; production deploy requires manual approval
- [ ] Slack/Discord webhook notifies team of deploy status

## Tests
- `T-003-1`: Push a branch with a TypeScript error — pipeline fails at typecheck step, no image built
- `T-003-2`: Push a branch with a failing test — pipeline fails at test step
- `T-003-3`: Merge a green PR to main — staging deploy completes within 10 minutes
- `T-003-4`: Trigger production deploy — requires manual approval click in GitHub Actions
- `T-003-5`: Staging deploy notification appears in team Slack channel""",
        },
        {
            "title": "[US-004] Database Schema & Migrations",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: infrastructure", "sprint: 0", "points: 5"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As a backend engineer, I want a migration-based schema management system, so that schema changes are versioned, reviewable, and applied automatically on deploy.

**Story Points:** 5

## Acceptance Criteria
- [ ] Migration tool configured (Flyway or golang-migrate equivalent)
- [ ] Core tables created: `organizations`, `events`, `users`, `organization_members`, `event_permissions`, `participants`
- [ ] RLS policies applied to all tenant-scoped tables
- [ ] Migrations run automatically on API startup (dev) and as a deploy step (staging/prod)
- [ ] `pnpm db:migrate` and `pnpm db:rollback` commands work locally

## Tests
- `T-004-1`: Fresh database — run migrations — all tables created, no errors
- `T-004-2`: Run migrations twice — idempotent, no duplicate table errors
- `T-004-3`: Insert a row with different `event_id` than RLS context — query returns 0 rows
- `T-004-4`: Roll back latest migration — schema returns to previous state cleanly""",
        },

        # ── SPRINT 0 ── AUTH ─────────────────────────────────────────────────
        {
            "title": "[US-010] Organization Registration & Onboarding",
            "labels": ["E-09: Auth", "P0: Critical", "type: user-story", "sprint: 0", "points: 5"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As a hackathon organizer, I want to create an organization account with my team's name and email domain, so that my team has an isolated workspace on HackSuite.

**Story Points:** 5

## Acceptance Criteria
- [ ] Sign-up flow: name, slug (auto-generated, editable), contact email
- [ ] Slug is globally unique; duplicate slugs return a clear error
- [ ] Creating org automatically assigns the creator as `owner`
- [ ] Org dashboard is accessible at `/org/:slug/dashboard` immediately after creation
- [ ] Welcome email sent to owner on org creation

## Tests
- `T-010-1`: Create org with slug "urichacks" — org created, owner role assigned, redirected to dashboard
- `T-010-2`: Create second org with slug "urichacks" — returns 409 "slug already taken"
- `T-010-3`: New org owner receives welcome email within 60 seconds
- `T-010-4`: Owner logs out and back in — dashboard accessible, org data intact""",
        },
        {
            "title": "[US-011] Team Member Invitations & Role Assignment",
            "labels": ["E-09: Auth", "P0: Critical", "type: user-story", "sprint: 0", "points: 5"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As an org owner or admin, I want to invite team members by email and assign them roles, so that organizers have appropriate access without sharing credentials.

**Story Points:** 5

## Acceptance Criteria
- [ ] Owner/admin can invite users by email with role: `admin` or `organizer`
- [ ] Invitee receives email with one-time accept link (expires 72 hours)
- [ ] Organizer role requires module access selection at invite time
- [ ] Owner can revoke access at any time; revoked user loses access on next request
- [ ] Org member list paginated and filterable by role

## Tests
- `T-011-1`: Invite user@example.com as organizer with checkin + finance — invite email sent
- `T-011-2`: Accept invite — user gains checkin and finance access only; cannot access judging
- `T-011-3`: Accept invite after 73 hours — returns "link expired"
- `T-011-4`: Owner revokes member — member's next API call returns 403
- `T-011-5`: Accept same invite link twice — "link already used" error""",
        },
        {
            "title": "[US-012] JWT Authentication & Session Management",
            "labels": ["E-09: Auth", "P0: Critical", "type: user-story", "sprint: 0", "points: 8"],
            "milestone": ms("Sprint 0"),
            "body": """## User Story
As the system, I want short-lived JWTs with refresh token rotation, so that compromised tokens have minimal blast radius.

**Story Points:** 8

## Acceptance Criteria
- [ ] Access token: 15-minute TTL, signed RS256
- [ ] Refresh token: 7-day TTL, httpOnly cookie, rotated on each use
- [ ] JWT claims include: `user_id`, `org_id`, `roles`, `event_permissions`
- [ ] Refresh token reuse detection: reused token invalidates entire session family
- [ ] All protected endpoints return 401 with `WWW-Authenticate: Bearer` on invalid token

## Tests
- `T-012-1`: Call protected endpoint with valid access token — 200
- `T-012-2`: Call protected endpoint with expired access token — 401
- `T-012-3`: Use refresh token — new token issued, old refresh token invalidated
- `T-012-4`: Reuse old rotated refresh token — entire session invalidated
- `T-012-5`: Call endpoint with valid token but insufficient role — 403""",
        },

        # ── SPRINT 1 ── REGISTRATION ─────────────────────────────────────────
        {
            "title": "[US-020] Custom Application Form Builder",
            "labels": ["E-01: Registration", "P0: Critical", "type: user-story", "sprint: 1", "points: 13"],
            "milestone": ms("Sprint 1"),
            "body": """## User Story
As an organizer, I want to build a custom registration form with conditional logic, so that I collect exactly the data my event needs without building a separate form tool.

**Story Points:** 13

## Acceptance Criteria
- [ ] Field types: text, textarea, email, select, multi-select, checkbox, file upload, section header
- [ ] Conditional display: show/hide field based on another field's value
- [ ] Field-level validation: required, min/max length, regex pattern
- [ ] Form preview renders participant-facing view in real time
- [ ] Form schema stored as JSONB; versioned when changed after submissions exist
- [ ] MLH consent checkbox available as a built-in field type with standard MLH copy

## Tests
- `T-020-1`: Add conditional field "Team name" shown only when "Do you have a team?" = Yes — preview shows conditional behavior
- `T-020-2`: Mark field required; submit without it — validation error returned with field name
- `T-020-3`: Submit form with file upload — file stored in S3; participant record has signed URL
- `T-020-4`: Update form after 10 submissions — existing submissions readable against original schema version
- `T-020-5`: Add MLH consent field — renders with correct MLH legal copy, uneditable""",
        },
        {
            "title": "[US-021] Participant Application Submission",
            "labels": ["E-01: Registration", "P0: Critical", "type: user-story", "sprint: 1", "points: 5"],
            "milestone": ms("Sprint 1"),
            "body": """## User Story
As a participant, I want to submit an application and receive a confirmation, so that I know my registration was received.

**Story Points:** 5

## Acceptance Criteria
- [ ] Application form accessible at `{event-slug}.hacksuite.app` without login
- [ ] Submission creates participant record with status `applied`
- [ ] Duplicate detection: same email + event_id returns 409 "already applied"
- [ ] Confirmation email sent within 60 seconds of submission
- [ ] Participant receives a "check your status" link to a read-only profile page

## Tests
- `T-021-1`: Submit application — participant record created with status "applied"; confirmation email received
- `T-021-2`: Submit same email twice — 409 returned, no duplicate record
- `T-021-3`: Submit with missing required field — 422 returned, specific field identified
- `T-021-4`: Check status link in email — loads participant profile showing "Application received\"""",
        },
        {
            "title": "[US-022] Acceptance Workflow & Waitlist Management",
            "labels": ["E-01: Registration", "P0: Critical", "type: user-story", "sprint: 1", "points: 8"],
            "milestone": ms("Sprint 1"),
            "body": """## User Story
As an organizer, I want to accept, reject, and waitlist applicants with bulk actions, so that I can process hundreds of applications without tedious one-by-one review.

**Story Points:** 8

## Acceptance Criteria
- [ ] Organizer dashboard lists all participants with status filters and column sort
- [ ] Bulk actions: select N participants → set status (accepted / waitlisted / rejected)
- [ ] Accepted participants receive email with unique QR code (SVG embed + attachment)
- [ ] Waitlisted participants receive waitlist position email
- [ ] Auto-promotion: when RSVP deadline passes, top waitlisted participant promoted automatically
- [ ] Auto-accept mode: first N applicants accepted on submission

## Tests
- `T-022-1`: Select 50 applicants, bulk-accept — all 50 updated; 50 QR emails queued within 5 minutes
- `T-022-2`: Accepted participant misses RSVP deadline — top waitlist participant promoted and emailed
- `T-022-3`: Enable auto-accept for 200 — 201st applicant gets waitlist email
- `T-022-4`: Bulk-reject 10 — 10 updated; rejected email sent; cannot re-apply
- `T-022-5`: Filter by status "waitlisted" + school "URI" — returns correct set""",
        },
        {
            "title": "[US-023] Registration Landing Page Customization",
            "labels": ["E-01: Registration", "P0: Critical", "type: user-story", "sprint: 1", "points: 5"],
            "milestone": ms("Sprint 1"),
            "body": """## User Story
As an organizer, I want to customize the public registration page with my event's branding, so that participants see a professional, on-brand first impression.

**Story Points:** 5

## Acceptance Criteria
- [ ] Settings panel: logo upload, primary color (hex), cover image, hero text, event date display, social links
- [ ] Changes preview live before publish
- [ ] Published page live at `{event-slug}.hacksuite.app`
- [ ] Renders correctly on mobile (375px) and desktop (1280px)
- [ ] Open Graph meta tags populated for social sharing

## Tests
- `T-023-1`: Upload logo, set primary color #7C3AED, save — landing page immediately reflects changes
- `T-023-2`: View at 375px — no horizontal scroll; CTA visible above fold
- `T-023-3`: Share URL on Slack — og:title and og:image render in link preview
- `T-023-4`: Toggle "registration closed" — form hidden, "Applications closed" message shown""",
        },

        # ── SPRINT 2 ── CHECK-IN ─────────────────────────────────────────────
        {
            "title": "[US-030] Mobile QR Scanner (No App Required)",
            "labels": ["E-02: Check-in", "P0: Critical", "type: user-story", "sprint: 2", "points: 13"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer on event day, I want to scan participant QR codes from my phone browser, so that I can check people in without installing an app or carrying a laptop.

**Story Points:** 13

## Acceptance Criteria
- [ ] Camera access via browser WebRTC API; works on iOS Safari 16+ and Android Chrome 110+
- [ ] QR decoded client-side (jsQR or zxing-js); decoded value POSTed to `/events/:id/checkin`
- [ ] Scan-to-response time ≤ 300ms on simulated 3G
- [ ] Success: participant name and accommodation flags shown for 2s; scanner auto-resets
- [ ] Error states: "already checked in" (amber), "not found" (red), "not accepted" (red)
- [ ] Works in landscape and portrait orientation

## Tests
- `T-030-1`: Scan valid QR on 3G throttle — response displayed within 300ms
- `T-030-2`: Scan QR for participant with dietary "vegan" — "VEGAN" flag shown prominently
- `T-030-3`: Scan same QR twice — second scan shows "Already checked in at [time]" in amber
- `T-030-4`: Scan on iOS Safari — camera opens without prompting app install
- `T-030-5`: Scan QR for waitlisted participant — red error "Participant not accepted\"""",
        },
        {
            "title": "[US-031] Offline Check-in Mode",
            "labels": ["E-02: Check-in", "P0: Critical", "type: user-story", "sprint: 2", "points: 13"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer, I want check-in to work when the venue WiFi fails, so that a network outage doesn't cause a 200-person line at the door.

**Story Points:** 13

## Acceptance Criteria
- [ ] PWA service worker caches check-in shell and participant QR lookup table on page load
- [ ] When offline: scans write to IndexedDB with `{ qr_code, scanned_at, device_id, synced: false }`
- [ ] Offline mode banner visible; queued scan count displayed
- [ ] On reconnect: queued batch auto-syncs via `POST /events/:id/checkin/sync`
- [ ] Server deduplicates by `qr_code + event_id`; returns conflicts array
- [ ] Conflicts shown in organizer dashboard for manual review

## Tests
- `T-031-1`: Go offline, scan 5 QR codes — 5 stored in IndexedDB; banner shows "5 scans queued (offline)"
- `T-031-2`: Reconnect — 5 scans sync; banner shows "Synced"; participants marked checked_in
- `T-031-3`: Two devices scan same QR offline; both reconnect — conflict appears in dashboard
- `T-031-4`: Reload page while offline — scanner still loads from service worker cache""",
        },
        {
            "title": "[US-032] Live Check-in Dashboard",
            "labels": ["E-02: Check-in", "P0: Critical", "type: user-story", "sprint: 2", "points: 8"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer, I want a real-time dashboard showing check-in progress, so that I know how many people have arrived and can spot issues instantly.

**Story Points:** 8

## Acceptance Criteria
- [ ] Dashboard shows: checked in, confirmed total, no-shows, accommodations count
- [ ] Numbers update in real time via WebSocket without page refresh
- [ ] Activity feed: last 20 check-in events, live-updating
- [ ] Filterable participant list: status, school, dietary flags
- [ ] Export checked-in list as CSV

## Tests
- `T-032-1`: Scan QR on another device — counter increments within 500ms; name in activity feed
- `T-032-2`: 50 participants check in simultaneously — all 50 reflected within 2 seconds
- `T-032-3`: Filter by dietary "gluten-free" — returns only gluten-free checked-in participants
- `T-032-4`: Export CSV — correct headers, one row per checked-in participant""",
        },
        {
            "title": "[US-033] Walk-in Registration",
            "labels": ["E-02: Check-in", "P0: Critical", "type: user-story", "sprint: 2", "points: 3"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer, I want to register and check in a walk-in participant on the spot, so that unregistered attendees aren't turned away at the door.

**Story Points:** 3

## Acceptance Criteria
- [ ] "Walk-in" button opens minimal form: first name, last name, email, school
- [ ] Submitting creates participant record with status `checked_in` immediately
- [ ] QR code displayed on-screen for badge printing
- [ ] Walk-in participants marked with a "walk-in" flag in the dashboard

## Tests
- `T-033-1`: Complete walk-in form — participant created with checked_in status; QR displayed within 1 second
- `T-033-2`: Walk-in with email that already exists — error "Email already registered" with option to check in by search
- `T-033-3`: Walk-in participant appears in dashboard with "walk-in" badge""",
        },

        # ── SPRINT 2 ── SCHEDULE ─────────────────────────────────────────────
        {
            "title": "[US-040] Agenda Builder",
            "labels": ["E-03: Schedule", "P1: High", "type: user-story", "sprint: 2", "points: 8"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer, I want to build the event agenda with time blocks and room assignments, so that I have a conflict-free schedule I can publish to participants.

**Story Points:** 8

## Acceptance Criteria
- [ ] Create block: title, type (workshop/meal/judging/ceremony/break), start, end, location, capacity
- [ ] Visual timeline view by time and room
- [ ] Conflict detection: overlapping blocks in same room triggers blocking warning
- [ ] "Publish schedule" toggle makes schedule visible to participants

## Tests
- `T-040-1`: Create "Opening Ceremony" 9:00–9:30 Room A — appears on timeline
- `T-040-2`: Create overlapping block in Room A — conflict warning; block not saved until resolved
- `T-040-3`: Publish schedule — /schedule route shows agenda; unpublish hides it
- `T-040-4`: Add 20 blocks — timeline renders without performance degradation""",
        },
        {
            "title": "[US-041] Participant-Facing Schedule",
            "labels": ["E-03: Schedule", "P1: High", "type: user-story", "sprint: 2", "points: 5"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As a participant, I want to view the event schedule on my phone without logging in, so that I know where to be and when.

**Story Points:** 5

## Acceptance Criteria
- [ ] Schedule at `{event-slug}.hacksuite.app/schedule` (no login required)
- [ ] Mobile-optimized: readable at 375px; tap to expand block details
- [ ] "Now" indicator shows current time position
- [ ] Schedule updates pushed via WebSocket; participant sees changes without refresh
- [ ] Cached for offline read after first load

## Tests
- `T-041-1`: View at 375px — no horizontal scroll; blocks readable
- `T-041-2`: Organizer updates block title — participant's open page reflects change within 1 second
- `T-041-3`: Load schedule, go offline, reload — loads from cache; offline banner shown
- `T-041-4`: "Now" indicator at correct position""",
        },
        {
            "title": "[US-042] Push Notifications to Participants",
            "labels": ["E-03: Schedule", "P1: High", "type: user-story", "sprint: 2", "points: 8"],
            "milestone": ms("Sprint 2"),
            "body": """## User Story
As an organizer, I want to send push notifications to checked-in participants, so that I can announce schedule changes and meal reminders without a PA system.

**Story Points:** 8

## Acceptance Criteria
- [ ] Participants prompted for Web Push permission on first schedule page load
- [ ] Compose form: title (50 char), body (140 char), target (all / checked-in / by track / by dietary)
- [ ] Preview shows estimated recipient count before send
- [ ] Notifications delivered via Web Push API (VAPID)
- [ ] Sent notification log with target count and delivered count

## Tests
- `T-042-1`: Send to "all checked-in" (100 participants) — notification appears within 10 seconds
- `T-042-2`: Send targeted to "vegan" dietary flag — only vegan participants receive it
- `T-042-3`: Compose with 141-character body — validation error before send
- `T-042-4`: Participant denied push — not in delivery count; no error thrown""",
        },

        # ── SPRINT 3 ── JUDGING ──────────────────────────────────────────────
        {
            "title": "[US-050] Project Submission Portal",
            "labels": ["E-04: Judging", "P0: Critical", "type: user-story", "sprint: 3", "points: 8"],
            "milestone": ms("Sprint 3"),
            "body": """## User Story
As a participant, I want to submit my project with all relevant links and track selection, so that judges can evaluate my work without me emailing anything separately.

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
- `T-050-5`: Upload 51MB file — rejected with "File exceeds 50MB limit\"""",
        },
        {
            "title": "[US-051] Judge Assignment & Workload Balancing",
            "labels": ["E-04: Judging", "P0: Critical", "type: user-story", "sprint: 3", "points: 8"],
            "milestone": ms("Sprint 3"),
            "body": """## User Story
As an organizer, I want to assign judges to tracks and have the system balance workloads automatically, so that no judge reviews 30 projects while another reviews 3.

**Story Points:** 8

## Acceptance Criteria
- [ ] Organizer assigns judges to one or more tracks
- [ ] System distributes submissions round-robin within a track
- [ ] Double-booking detection: judge assigned to overlapping schedule slots triggers blocking alert
- [ ] Judge receives magic link email (no account required)
- [ ] Workload summary: submissions per judge, scored vs. unscored

## Tests
- `T-051-1`: Assign 3 judges to track with 30 submissions — each assigned 10 automatically
- `T-051-2`: Assign same judge to overlapping tracks — conflict warning; not saved until resolved
- `T-051-3`: Judge clicks magic link — lands on queue; no password required
- `T-051-4`: Magic link used after event end — "Judging has closed" message""",
        },
        {
            "title": "[US-052] Scoring Rubric & Judge Portal",
            "labels": ["E-04: Judging", "P0: Critical", "type: user-story", "sprint: 3", "points: 8"],
            "milestone": ms("Sprint 3"),
            "body": """## User Story
As a judge, I want to score submissions on a clear rubric from my phone, so that I can evaluate projects quickly without paper or spreadsheets.

**Story Points:** 8

## Acceptance Criteria
- [ ] Rubric configurable per track: up to 8 criteria, each with label, description, max score (1–10)
- [ ] Mobile-optimized portal: one submission at a time with all links accessible
- [ ] Scores auto-save on change; no explicit submit button per criterion
- [ ] Judges cannot see other judges' scores until organizer publishes
- [ ] Progress indicator: "7 of 10 submissions scored"

## Tests
- `T-052-1`: Score all criteria on mobile (375px) — all sliders accessible without horizontal scroll
- `T-052-2`: Close browser mid-scoring and reopen magic link — scores preserved
- `T-052-3`: Attempt to view another judge's scores via API — 403 returned
- `T-052-4`: Score 9 of 10 — progress shows "9 of 10"; incomplete flagged for organizer""",
        },
        {
            "title": "[US-053] Live Leaderboard & Results",
            "labels": ["E-04: Judging", "P0: Critical", "type: user-story", "sprint: 3", "points: 5"],
            "milestone": ms("Sprint 3"),
            "body": """## User Story
As an organizer, I want a live leaderboard that updates as judges submit scores, so that I can track judging progress and announce winners immediately when scoring closes.

**Story Points:** 5

## Acceptance Criteria
- [ ] Leaderboard per track ranked by weighted average score
- [ ] Updates in real time via WebSocket
- [ ] Organizer can toggle public visibility
- [ ] Configurable tie-breaking (random or secondary criterion)
- [ ] CSV export: all submissions, scores, final rankings

## Tests
- `T-053-1`: Judge submits score — leaderboard rank updates within 1 second
- `T-053-2`: Toggle public leaderboard on — participants can view at `/events/:id/leaderboard/:track`
- `T-053-3`: Two submissions tied — tie-breaking applied; deterministic result on reload
- `T-053-4`: Export CSV — submission title, team, each criterion score, final score, rank""",
        },

        # ── SPRINT 4 ── SPONSORS ─────────────────────────────────────────────
        {
            "title": "[US-060] Sponsor Profile & Tier Management",
            "labels": ["E-05: Sponsors", "P1: High", "type: user-story", "sprint: 4", "points: 8"],
            "milestone": ms("Sprint 4"),
            "body": """## User Story
As an organizer, I want to create sponsor profiles with tiers and track deliverables, so that I never miss a sponsorship commitment during the event.

**Story Points:** 8

## Acceptance Criteria
- [ ] Organizer defines tiers (name, benefits, amount) before adding sponsors
- [ ] Sponsor profile: name, tier, POC (name + email + phone), logo upload, description, payment status
- [ ] Deliverable checklist per sponsor: title, due date, completion toggle, evidence attachment
- [ ] Overdue deliverables surface as red alerts in organizer dashboard header
- [ ] Sponsor list sortable by tier, payment status, deliverable completion rate

## Tests
- `T-060-1`: Create "Gold" tier; add sponsor "Acme Corp" at Gold — profile with Gold badge
- `T-060-2`: Add deliverable due today, leave incomplete — alert in dashboard header
- `T-060-3`: Mark deliverable complete with evidence URL — green checkmark; alert clears
- `T-060-4`: Log $2,000 payment against $5,000 expected — profile shows "$2,000 / $5,000 received\"""",
        },
        {
            "title": "[US-061] Sponsor Portal (Read-Only)",
            "labels": ["E-05: Sponsors", "P1: High", "type: user-story", "sprint: 4", "points: 5"],
            "milestone": ms("Sprint 4"),
            "body": """## User Story
As a sponsor contact, I want to log in and view my sponsorship profile and deliverable status, so that I don't need to email the organizing team for updates.

**Story Points:** 5

## Acceptance Criteria
- [ ] Organizer grants access by entering sponsor POC email
- [ ] Sponsor receives magic link to read-only portal (profile, deliverables, payment status)
- [ ] Sponsor cannot view other sponsors' data
- [ ] Post-event: portal shows recap metrics (attendance, demographics, prize winners)

## Tests
- `T-061-1`: Grant portal access to sponsor@acme.com — invite email sent
- `T-061-2`: Sponsor clicks link — sees only their own profile
- `T-061-3`: Access another sponsor's profile URL — 403 returned
- `T-061-4`: Post-event: portal shows attendance figure and their prize track winner""",
        },

        # ── SPRINT 4 ── FINANCE ──────────────────────────────────────────────
        {
            "title": "[US-070] Budget Planning & Tracking",
            "labels": ["E-06: Finance", "P1: High", "type: user-story", "sprint: 4", "points: 8"],
            "milestone": ms("Sprint 4"),
            "body": """## User Story
As an organizer, I want to build a budget and track actual spend against it, so that I don't overspend and can justify costs to university administration.

**Story Points:** 8

## Acceptance Criteria
- [ ] Budget line items: category (catering/swag/venue/prizes/travel/A-V/misc), description, estimated amount
- [ ] Income tracked: university funding, MLH grant, sponsor payments (auto from Sponsor module)
- [ ] Dashboard: total income, total estimated, total actual, variance, remaining balance
- [ ] Per-head cost: total actual spend / confirmed check-in count (live)
- [ ] Warn (visual flag) if actual exceeds estimated on any line item

## Tests
- `T-070-1`: "Catering" estimated $3,000; log $3,200 actual — red variance flag; balance updates
- `T-070-2`: Log sponsor payment in Sponsor module — Finance shows income +$5,000 automatically
- `T-070-3`: 150 participants check in — per-head cost updates live on finance dashboard
- `T-070-4`: Dashboard totals match sum of all line items""",
        },
        {
            "title": "[US-071] Expense Submission & Reimbursement Workflow",
            "labels": ["E-06: Finance", "P1: High", "type: user-story", "sprint: 4", "points: 8"],
            "milestone": ms("Sprint 4"),
            "body": """## User Story
As an organizer, I want to submit expenses with receipts and get reimbursed through the platform, so that reimbursements don't get lost in email chains.

**Story Points:** 8

## Acceptance Criteria
- [ ] Any organizer submits: amount, category, description, receipt (image or PDF, max 10MB)
- [ ] Workflow: `submitted → approved → paid` (or `rejected`)
- [ ] Approval requires `admin` or `owner` role; approver cannot approve own expense
- [ ] Rejected expenses require rejection reason; submitter emailed
- [ ] Export: all expenses as CSV with status, amount, category, submitter, approver, date

## Tests
- `T-071-1`: Submit $45 "Printer paper" with receipt — status "submitted"; admin sees in approval queue
- `T-071-2`: Admin approves — status "approved"; submitter receives email
- `T-071-3`: Submitter tries to approve own expense — button disabled; API returns 403
- `T-071-4`: Admin rejects with reason — submitter receives rejection reason email
- `T-071-5`: Export CSV — all columns present; amounts sum correctly""",
        },

        # ── SPRINT 5 ── MARKETING ────────────────────────────────────────────
        {
            "title": "[US-080] Email Campaign Builder",
            "labels": ["E-07: Marketing", "P2: Medium", "type: user-story", "sprint: 5", "points: 13"],
            "milestone": ms("Sprint 5"),
            "body": """## User Story
As an organizer, I want to send branded emails to participant segments, so that I can drive registrations and communicate event updates without a separate email tool.

**Story Points:** 13

## Acceptance Criteria
- [ ] Block-based editor: text, image, button, divider, header blocks; drag to reorder
- [ ] Pre-built templates: "Applications Open", "You're Accepted", "Event Reminder", "Results Announced"
- [ ] Recipient targeting: all / accepted / waitlisted / custom filter
- [ ] Schedule send: pick date + time or send immediately
- [ ] Metrics: delivered, opened, clicked (via webhook)
- [ ] Unsubscribe link auto-injected; unsubscribed excluded from future sends

## Tests
- `T-080-1`: Build email with "Applications Open" template, customize hero — preview renders correctly
- `T-080-2`: Schedule send for +1 hour — sends at correct time; metrics update
- `T-080-3`: Send to "accepted only" — only accepted participants receive it
- `T-080-4`: Participant unsubscribes — excluded from next campaign
- `T-080-5`: Send to 500 participants — all delivered within 10 minutes""",
        },
        {
            "title": "[US-081] Referral Link Tracking & Hype Dashboard",
            "labels": ["E-07: Marketing", "P2: Medium", "type: user-story", "sprint: 5", "points: 8"],
            "milestone": ms("Sprint 5"),
            "body": """## User Story
As an organizer, I want to see which marketing channels are driving registrations, so that I know where to focus my outreach effort.

**Story Points:** 8

## Acceptance Criteria
- [ ] Generate UTM-tagged referral links per channel (Instagram, Discord, flyer QR, email footer)
- [ ] Each link click tracked (page view); conversion tracked when application submitted through that link
- [ ] Hype dashboard: registration growth chart, breakdown by referral source, conversion rate per channel
- [ ] Landing page visit counter (privacy-respecting; no PII per visit)
- [ ] Dashboard refreshes every 5 minutes

## Tests
- `T-081-1`: Generate "Instagram bio" link — UTM params correct; redirects to registration page
- `T-081-2`: Click Instagram link and submit — application attributed to Instagram in dashboard
- `T-081-3`: View dashboard — growth chart by day; Instagram vs Discord conversion visible
- `T-081-4`: Dashboard shows conversion rate: (submissions / page views) per channel""",
        },
        {
            "title": "[US-082] Social Copy Generator (Claude API)",
            "labels": ["E-07: Marketing", "P2: Medium", "type: user-story", "sprint: 5", "points: 5"],
            "milestone": ms("Sprint 5"),
            "body": """## User Story
As an organizer, I want AI-generated social captions for my event, so that I spend 5 minutes on marketing copy instead of 45.

**Story Points:** 5

## Acceptance Criteria
- [ ] Input: event name, dates, location, theme, target audience
- [ ] Generates drafts for: Twitter/X (280 char), Instagram caption, LinkedIn post, Discord announcement
- [ ] Output editable in-place before copying
- [ ] "Regenerate" button produces a new variation
- [ ] Calls Claude API (`claude-sonnet-4-6`) via backend; API key never exposed to client

## Tests
- `T-082-1`: Enter event details and generate — 4 distinct captions produced within 5 seconds
- `T-082-2`: Twitter/X output ≤ 280 characters
- `T-082-3`: Click "Regenerate" — new, different variation produced
- `T-082-4`: Edit generated caption — edited text preserved in copy-to-clipboard
- `T-082-5`: Inspect network traffic — Claude API key not present in any client-side request""",
        },

        # ── SPRINT 5 ── REPORTING ────────────────────────────────────────────
        {
            "title": "[US-090] Auto-Assembled Event Report",
            "labels": ["E-08: Reporting", "P1: High", "type: user-story", "sprint: 5", "points: 13"],
            "milestone": ms("Sprint 5"),
            "body": """## User Story
As an organizer, I want the post-event report to be auto-populated from live data, so that I spend 20 minutes writing a summary rather than 4 hours copying data between docs.

**Story Points:** 13

## Acceptance Criteria
- [ ] Report auto-assembles after event end date: attendance, demographics, judging results, budget summary, top channels
- [ ] Organizer can add written summary (rich text) and up to 20 photos
- [ ] Internal export: all sections. Sponsor export: attendance, demographics, prize winners, deliverable status (no budget)
- [ ] PDF export as async job; download link emailed when ready (< 30s)
- [ ] Report snapshot immutable once exported
- [ ] Shareable org-scoped link for institutional handoff

## Tests
- `T-090-1`: Trigger report after event end — all sections populated; no manual data entry
- `T-090-2`: Export internal PDF — all sections including budget present
- `T-090-3`: Export sponsor PDF — no budget section; only sponsor-relevant metrics
- `T-090-4`: Export PDF — download link emailed within 30 seconds
- `T-090-5`: Share link — next year's organizer (different account) can view without login
- `T-090-6`: Re-export after editing summary — new snapshot; old snapshot unchanged""",
        },

        # ── SPRINT 6 ── HARDENING ────────────────────────────────────────────
        {
            "title": "[Sprint 6] Load Test: 1,000 Simultaneous QR Scans",
            "labels": ["E-02: Check-in", "P0: Critical", "type: chore", "sprint: 6", "points: 8"],
            "milestone": ms("Sprint 6"),
            "body": """## Task
Simulate 1,000 simultaneous QR scans against staging and verify p99 latency < 300ms.

## Acceptance Criteria
- [ ] Load test script written (k6 or Artillery)
- [ ] 1,000 virtual users scanning simultaneously
- [ ] p99 response time < 300ms
- [ ] Zero 5xx errors under load
- [ ] Results documented and attached to this issue""",
        },
        {
            "title": "[Sprint 6] WCAG 2.1 AA Accessibility Audit",
            "labels": ["E-01: Registration", "P1: High", "type: chore", "sprint: 6", "points: 8"],
            "milestone": ms("Sprint 6"),
            "body": """## Task
Run axe-core automated audit + manual review on all participant-facing pages.

## Acceptance Criteria
- [ ] axe-core integrated in CI (fails build on any AA violation)
- [ ] Manual keyboard navigation audit on: registration form, schedule page, submission portal
- [ ] Screen reader test on primary participant flows (NVDA or VoiceOver)
- [ ] 0 WCAG AA violations on all participant-facing pages
- [ ] Remediation for any issues found""",
        },
        {
            "title": "[Sprint 6] Security Review: RLS, Input Validation, File Upload Hardening",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: chore", "sprint: 6", "points: 13"],
            "milestone": ms("Sprint 6"),
            "body": """## Task
Internal security review covering tenant isolation, input validation, and file upload safety.

## Acceptance Criteria
- [ ] RLS policy audit: verify every table has correct org_id/event_id scoping
- [ ] Input validation sweep: all endpoints validated server-side; parameterized queries confirmed
- [ ] File upload: type allowlist enforced; virus scan integrated; files in private S3 with signed URLs only
- [ ] Audit log implemented: immutable log of status changes on participants, expenses, deliverables
- [ ] Dependency scan clean (Dependabot/Snyk — no critical CVEs unaddressed)
- [ ] Tech Lead sign-off documented""",
        },
        {
            "title": "[Sprint 6] E2E Test Suite (Playwright): Critical Paths",
            "labels": ["E-00: Infrastructure", "P0: Critical", "type: chore", "sprint: 6", "points: 13"],
            "milestone": ms("Sprint 6"),
            "body": """## Task
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
- [ ] Mobile viewport tested for check-in and judging paths (375px)""",
        },

        # ── SPRINT 7 ── INTEGRATIONS ─────────────────────────────────────────
        {
            "title": "[US-100] MLH API Integration",
            "labels": ["E-10: Integrations", "P2: Medium", "type: user-story", "sprint: 7", "points: 8"],
            "milestone": ms("Sprint 7"),
            "body": """## User Story
As an MLH-affiliated hackathon organizer, I want HackSuite to validate my MLH affiliation and share required event data, so that I stay compliant with MLH requirements automatically.

**Story Points:** 8

## Acceptance Criteria
- [ ] Org settings: MLH affiliation toggle with API key field
- [ ] On event creation: validate affiliation status with MLH API
- [ ] Share required event data fields (attendance count, dates, school) on event close
- [ ] MLH consent checkbox in registration form uses official MLH copy and version
- [ ] Integration documented for organizers in onboarding""",
        },
        {
            "title": "[US-101] Google / Apple Wallet QR Pass",
            "labels": ["E-10: Integrations", "P2: Medium", "type: user-story", "sprint: 7", "points: 8"],
            "milestone": ms("Sprint 7"),
            "body": """## User Story
As a participant, I want to add my check-in QR code to my phone's Wallet app, so that I don't need to open my email on event day.

**Story Points:** 8

## Acceptance Criteria
- [ ] Acceptance email includes "Add to Apple Wallet" and "Add to Google Wallet" buttons
- [ ] Pass contains: event name, date, participant name, QR code
- [ ] Pass updates automatically if participant info changes before event
- [ ] Passes generated server-side (no third-party pass service storing participant PII)""",
        },
        {
            "title": "[US-102] Slack / Discord Webhook Integration",
            "labels": ["E-10: Integrations", "P2: Medium", "type: user-story", "sprint: 7", "points: 5"],
            "milestone": ms("Sprint 7"),
            "body": """## User Story
As an organizer, I want HackSuite to send alerts to our Slack or Discord channel, so that the whole team stays informed without watching a dashboard.

**Story Points:** 5

## Acceptance Criteria
- [ ] Org settings: webhook URL field (Slack-compatible or Discord webhook)
- [ ] Configurable triggers: check-in milestone reached (25%, 50%, 75%, 100%), overdue sponsor deliverable, expense awaiting approval
- [ ] Message format: clear, actionable, includes event name and direct link
- [ ] Webhook failures logged; organizer notified if webhook errors persist > 5 minutes""",
        },
        {
            "title": "[US-103] University SSO (SAML/OIDC)",
            "labels": ["E-09: Auth", "P2: Medium", "type: user-story", "sprint: 7", "points: 13"],
            "milestone": ms("Sprint 7"),
            "body": """## User Story
As a university IT administrator, I want HackSuite to support SAML/OIDC so that hackathon registration can be restricted to verified university students.

**Story Points:** 13

## Acceptance Criteria
- [ ] Per-org SSO configuration: upload SAML metadata or enter OIDC discovery URL
- [ ] Optional: restrict registration to SSO-authenticated users only (toggle)
- [ ] SSO login replaces email/password for org members; participant registration supports optional SSO
- [ ] Tested with at least one real university IdP (Shibboleth or Azure AD)
- [ ] Fallback to email magic link if SSO unavailable""",
        },
        {
            "title": "[US-104] Zapier / Make Integration (Event Triggers)",
            "labels": ["E-10: Integrations", "P2: Medium", "type: user-story", "sprint: 7", "points: 8"],
            "milestone": ms("Sprint 7"),
            "body": """## User Story
As an organizer, I want HackSuite to emit event triggers to Zapier or Make, so that I can build custom automations without code.

**Story Points:** 8

## Acceptance Criteria
- [ ] Supported triggers: new registration, participant status changed, project submitted, score submitted, expense submitted
- [ ] Trigger payload includes relevant entity data in JSON
- [ ] Zapier app listing (or webhook endpoint for Make)
- [ ] Retry logic on failed webhook deliveries (3 retries with exponential backoff)
- [ ] Trigger log visible to org admins""",
        },
    ]

    created = 0
    for issue in issues:
        data, status = api("POST", f"/repos/{repo}/issues", token, {
            "title": issue["title"],
            "body": issue["body"],
            "labels": issue["labels"],
            "milestone": issue.get("milestone"),
        })
        if data:
            print(f"  [+] #{data['number']} {issue['title'][:70]}")
            created += 1
        else:
            print(f"  [!] FAILED: {issue['title'][:70]}")
        time.sleep(0.4)  # Stay well under GitHub rate limits

    return created


def push_repo(username, repo_name):
    print("\n[5/5] Instructions to push local repo to GitHub:")
    print(f"""
  Run these commands from your project root:

    git remote add origin https://github.com/{username}/{repo_name}.git
    git branch -M main
    git push -u origin main
""")


def main():
    parser = argparse.ArgumentParser(description="Set up HackSuite GitHub repo with issues")
    parser.add_argument("--token",    required=True, help="GitHub Personal Access Token (scope: repo)")
    parser.add_argument("--username", required=True, help="Your GitHub username")
    args = parser.parse_args()

    print("=" * 60)
    print("  HackSuite GitHub Setup")
    print("=" * 60)

    repo = create_repo(args.token, args.username)
    if not repo:
        print("ERROR: Could not create or find repo. Check your token and try again.")
        return

    create_labels(args.token, repo)
    milestones = create_milestones(args.token, repo)
    count = create_issues(args.token, repo, milestones)
    push_repo(args.username, REPO_NAME)

    print("=" * 60)
    print(f"  Done! {count} issues created.")
    print(f"  Repo: https://github.com/{repo}")
    print("=" * 60)


if __name__ == "__main__":
    main()
