-- Form definitions (custom application form per event)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  fields JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for participant status changes
CREATE TABLE IF NOT EXISTS participant_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing page settings
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#7c3aed',
  hero_text TEXT,
  description TEXT,
  social_links JSONB DEFAULT '{}',
  registration_open BOOLEAN DEFAULT TRUE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_form_definitions_event ON form_definitions(event_id);
CREATE INDEX IF NOT EXISTS idx_participant_audit_event ON participant_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_event ON landing_pages(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
