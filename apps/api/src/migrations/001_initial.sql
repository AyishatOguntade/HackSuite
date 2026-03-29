-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  first_name     TEXT,
  last_name      TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'organizer')),
  module_access TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id   ON organization_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id  ON organization_members (user_id);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'organizer')),
  module_access TEXT[] NOT NULL DEFAULT '{}',
  token         TEXT NOT NULL UNIQUE,
  invited_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token    ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_org_id   ON invitations (org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email    ON invitations (email);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  family      TEXT NOT NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family     ON refresh_tokens (family);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  start_date  TIMESTAMPTZ,
  end_date    TIMESTAMPTZ,
  location    TEXT,
  max_participants INTEGER,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_events_org_id ON events (org_id);
CREATE INDEX IF NOT EXISTS idx_events_slug   ON events (org_id, slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  school        TEXT,
  status        TEXT NOT NULL DEFAULT 'applied' CHECK (
    status IN ('applied', 'waitlisted', 'accepted', 'confirmed', 'checked_in', 'no_show', 'rejected')
  ),
  qr_code       TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants (event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id  ON participants (user_id);
CREATE INDEX IF NOT EXISTS idx_participants_email    ON participants (event_id, email);
CREATE INDEX IF NOT EXISTS idx_participants_status   ON participants (event_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_qr_code  ON participants (qr_code);
