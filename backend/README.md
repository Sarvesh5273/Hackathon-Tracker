# Hackathon Tracker Backend

FastAPI backend for the Hackathon Tracker application with Supabase integration, Gemini AI extraction, and Crawl4AI web scraping.

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern async web framework
- **Pydantic** - Data validation
- **Supabase** - PostgreSQL database + Auth
- **Crawl4AI** - Web scraping with stealth mode
- **Google Generative AI** - Gemini 1.5 Flash for extraction
- **python-jose** - JWT handling

## Setup

### 1. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (for server operations)
- `SUPABASE_ANON_KEY` - Anon key (for JWT verification)
- `GEMINI_API_KEY` - Google Generative AI API key

### 3. Set Up Supabase Database

Create the following tables in your Supabase project:

#### `hackathons` Table
```sql
create table hackathons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  registration_deadline timestamp with time zone,
  submission_deadline timestamp with time zone,
  location text not null,
  mode text not null check (mode in ('Online', 'Hybrid', 'Offline')),
  description text not null,
  status text not null default 'interested' check (status in ('interested', 'registered', 'completed', 'dropped')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, url)
);

create index idx_hackathons_user on hackathons(user_id);
create index idx_hackathons_deadline on hackathons(submission_deadline);
```

#### `plans` Table
```sql
create table plans (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_idea text not null,
  tech_stack text[] not null,
  team_members text[] not null,
  notes text,
  priority text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(hackathon_id, user_id)
);

create index idx_plans_hackathon on plans(hackathon_id);
create index idx_plans_user on plans(user_id);
```

#### `user_tokens` Table (for extension)
```sql
create table user_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text unique not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '90 days')
);

create index idx_user_tokens_token on user_tokens(token);
create index idx_user_tokens_user on user_tokens(user_id);
```

### 4. Run the Server

```bash
python main.py
```

Server runs on `http://localhost:8000`

API docs available at: `http://localhost:8000/docs`

## API Endpoints

### POST `/api/extract`
Extract hackathon details from a URL or provided text.
- **Auth**: Not required
- **Body**: `{url: string, title: string, page_text?: string}`
- **Returns**: Extracted hackathon details (JSON)

### POST `/api/hackathons`
Create a new hackathon entry.
- **Auth**: JWT or X-Extension-Token header
- **Body**: Hackathon details
- **Returns**: Created hackathon object

### GET `/api/hackathons`
Get all hackathons for current user (ordered by submission deadline).
- **Auth**: JWT or X-Extension-Token header
- **Returns**: Array of hackathon objects

### PUT `/api/hackathons/{id}/plan`
Create or update plan for a hackathon (upsert).
- **Auth**: JWT or X-Extension-Token header
- **Body**: `{project_idea, tech_stack, team_members, notes?, priority?}`
- **Returns**: Plan object

### DELETE `/api/hackathons/{id}`
Delete a hackathon.
- **Auth**: JWT or X-Extension-Token header
- **Returns**: Success message

### POST `/api/auth/extension-token`
Generate an extension token for the web app.
- **Auth**: JWT only
- **Returns**: `{token: string}`

### GET `/health`
Health check endpoint.
- **Returns**: `{status: "ok"}`

## Authentication

Two auth methods supported:

1. **JWT (from Supabase Auth)**
   - Header: `Authorization: Bearer <token>`
   - Validated against Supabase Auth API

2. **Extension Token (for Chrome extension)**
   - Header: `X-Extension-Token: <token>`
   - Stored in `user_tokens` table

## Error Handling

All errors return proper HTTP status codes with detailed messages:
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

## CORS Configuration

Origins allowed:
- `chrome-extension://*` (for extension)
- `http://localhost:5173` (frontend dev)
- `http://localhost:3000` (alternative frontend)

## Development Notes

- Uses Gemini 1.5 Flash for efficient text extraction
- Crawl4AI includes stealth mode for robust web scraping
- Pydantic models validate all inputs/outputs
- Supabase async client for non-blocking operations
- Proper error handling and logging for debugging
