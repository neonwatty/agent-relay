export const SCHEMA_VERSION = 1

export const MIGRATION_001 = `
create table if not exists projects (
  id text primary key,
  name text not null,
  root_path text not null,
  created_at text not null,
  updated_at text not null,
  unique(name, root_path)
);

create table if not exists sessions (
  id text primary key,
  project_id text not null references projects(id),
  name text not null,
  role text,
  cwd text not null,
  status text not null,
  last_seen_at text not null,
  created_at text not null,
  updated_at text not null,
  unique(project_id, name)
);

create table if not exists events (
  id text primary key,
  project_id text not null references projects(id),
  session_id text not null references sessions(id),
  type text not null,
  status text not null,
  summary text not null,
  details text,
  tags_json text not null,
  links_json text not null,
  created_at text not null
);

create index if not exists events_project_created_idx on events(project_id, created_at desc);
create index if not exists events_type_idx on events(type);
create index if not exists events_status_idx on events(status);

create table if not exists bus_records (
  id text primary key,
  project_id text not null references projects(id),
  session_id text not null references sessions(id),
  kind text not null,
  summary text,
  payload_json text not null,
  expires_at text not null,
  created_at text not null,
  updated_at text not null
);

create index if not exists bus_project_kind_expires_idx on bus_records(project_id, kind, expires_at);
create index if not exists bus_session_kind_idx on bus_records(session_id, kind);
`
