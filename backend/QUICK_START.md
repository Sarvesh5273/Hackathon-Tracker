# Quick Start Guide

## 1. Prerequisites
- Python 3.11+
- Active Supabase project
- Google Gemini API key

## 2. Initial Setup

```bash
cd backend
bash setup.sh
```

Or manually:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 3. Configure Environment

Edit `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
```

## 4. Set Up Supabase Database

Go to your Supabase project → SQL Editor and run these commands:

```sql
-- Hackathons table
create table hackathons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  registration_open_at timestamp with time zone,
  registration_deadline timestamp with time zone,
  submission_open_at timestamp with time zone,
  submission_deadline timestamp with time zone,
  phases jsonb,
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
create index idx_hackathons_phases on hackathons using GIN (phases);

-- Plans table
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

-- User tokens table (for extension)
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

If you already created the table earlier, run `sql_add_hackathon_phases.sql` in Supabase SQL editor to add the new columns/indexes.

## 5. Run the Server

```bash
python main.py
```

Server starts at: `http://localhost:8000`

## 6. Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## 7. Test Health Check

```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

## 8. Next Steps

- Check `API_DOCUMENTATION.md` for endpoint details
- Use `/docs` interface to test endpoints
- Integrate with frontend (see frontend instructions)
- Set up extension (see extension instructions)

## Using Docker (Optional)

```bash
docker-compose up
```

This starts the API with auto-reload on port 8000.

## Troubleshooting

**Module not found errors**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Supabase connection errors**
- Verify `.env` variables are correct
- Check Supabase project is active
- Ensure tables exist in database

**Gemini API errors**
- Verify API key is valid
- Check quota/billing in Google Cloud Console

**CORS errors in frontend**
- Ensure frontend origin is in CORS allowed list
- Check browser console for specific error
