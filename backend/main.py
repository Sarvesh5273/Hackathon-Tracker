import os
import json
import secrets
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from contextlib import asynccontextmanager, suppress

import httpx
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from crawl4ai import AsyncWebCrawler
from supabase._async.client import AsyncClient, create_client as acreate_client

from schemas import (
    ExtractRequest,
    ExtractResponse,
    HackathonCreate,
    HackathonResponse,
    PlanRequest,
    PlanResponse,
    ExtensionTokenResponse,
)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing")
if not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_KEY is missing")
if not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_ANON_KEY is missing")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing")

genai.configure(api_key=GEMINI_API_KEY)

supabase: Optional[AsyncClient] = None

logger = logging.getLogger("hackos")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))


def _token_prefix(token: Optional[str]) -> str:
    if not token:
        return ""
    return token[:12]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def query_urgent_hackathons(user_id: Optional[str] = None):
    now = utcnow()
    soon = now + timedelta(hours=24)

    q = (
        supabase
        .table("hackathons")
        .select("id,user_id,name,url,submission_deadline,location,mode,status")
        .gte("submission_deadline", now.isoformat())
        .lte("submission_deadline", soon.isoformat())
    )

    if user_id:
        q = q.eq("user_id", user_id)

    resp = await q.execute()
    return resp.data or []


async def urgent_notifier_loop():
    while True:
        try:
            urgent = await query_urgent_hackathons()
            if urgent:
                names = ", ".join([h.get("name", "?") for h in urgent[:10]])
                logger.warning("Urgent hackathons (<24h): %s (count=%s)", names, len(urgent))
        except Exception:
            logger.exception("Urgent notifier loop failed")

        await asyncio.sleep(60 * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase
    supabase = await acreate_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    app.state.urgent_task = asyncio.create_task(urgent_notifier_loop())

    try:
        yield
    finally:
        task = getattr(app.state, "urgent_task", None)
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

        if supabase:
            await supabase.close()


app = FastAPI(
    title="Hackathon Tracker API",
    description="Backend for hackathon tracking with extraction, planning, and auth",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{path:path}")
async def cors_preflight(path: str):
    return Response(status_code=204)


async def validate_supabase_jwt(token: str) -> str:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )

        logger.info(
            "JWT validate status=%s token_prefix=%s",
            response.status_code,
            _token_prefix(token),
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid JWT token")

        user = response.json()
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="JWT valid but user id missing")

        return user_id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"JWT validation failed: {str(e)}")


async def get_current_user_jwt(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    logger.info("Auth header present=%s", bool(auth_header))

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = auth_header.split()
    logger.info("Auth header bearer=%s", bool(parts and parts[0].lower() == "bearer"))

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    token = parts[1]
    logger.info("JWT token_prefix=%s", _token_prefix(token))
    return await validate_supabase_jwt(token)


async def get_current_user_token(
    x_extension_token: Optional[str] = Header(None),
) -> str:
    logger.info("Extension token present=%s", bool(x_extension_token))

    if not x_extension_token:
        raise HTTPException(status_code=401, detail="Missing X-Extension-Token header")

    try:
        response = await (
            supabase
            .table("user_tokens")
            .select("user_id")
            .eq("token", x_extension_token)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid extension token")

        return response.data["user_id"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


async def get_current_user(
    request: Request,
    x_extension_token: Optional[str] = Header(None),
) -> str:
    auth_header = request.headers.get("Authorization")

    if auth_header:
        logger.info("Auth branch=jwt")
        return await get_current_user_jwt(request)
    if x_extension_token:
        logger.info("Auth branch=extension-token")
        return await get_current_user_token(x_extension_token)

    logger.info("Auth branch=missing")
    raise HTTPException(status_code=401, detail="Missing authentication")


async def extract_with_crawl4ai(url: str) -> str:
    try:
        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await asyncio.wait_for(
                crawler.arun(
                    url=url,
                    stealth=True,
                    wait_for="body",
                ),
                timeout=15,
            )
            return result.markdown
    except asyncio.TimeoutError:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawl4AI extraction failed: {str(e)}")


def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


PHASE_TYPES = {
    "registration",
    "team_formation",
    "ideation",
    "orientation",
    "kickoff",
    "workshop",
    "mentoring",
    "hacking",
    "checkpoint",
    "submission",
    "demo",
    "judging",
    "results",
    "other",
}


def _parse_iso(iso: Optional[str]) -> Optional[datetime]:
    if not iso or not isinstance(iso, str):
        return None
    value = iso.strip()
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _normalize_phases(phases) -> list[dict]:
    if not isinstance(phases, list):
        return []

    normalized: list[dict] = []
    for item in phases:
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        elif hasattr(item, "dict"):
            item = item.dict()

        if not isinstance(item, dict):
            continue

        name = str(item.get("name") or item.get("label") or "").strip()
        if not name:
            continue

        phase_type = str(item.get("type") or item.get("phase_type") or "").strip().lower()
        if phase_type and phase_type not in PHASE_TYPES:
            phase_type = "other"
        if not phase_type:
            phase_type = None

        start_at = item.get("start_at") or item.get("starts_at")
        end_at = item.get("end_at") or item.get("ends_at") or item.get("deadline_at")

        start_at = start_at.strip() if isinstance(start_at, str) and start_at.strip() else None
        end_at = end_at.strip() if isinstance(end_at, str) and end_at.strip() else None

        normalized.append(
            {
                "name": name,
                "type": phase_type,
                "start_at": start_at,
                "end_at": end_at,
            }
        )

    return normalized


def _derive_dates_from_phases(payload: dict, phases: list[dict]) -> None:
    if not phases:
        return

    def is_registration(p: dict) -> bool:
        t = (p.get("type") or "").lower()
        name = (p.get("name") or "").lower()
        return t == "registration" or "register" in name

    def is_submission(p: dict) -> bool:
        t = (p.get("type") or "").lower()
        name = (p.get("name") or "").lower()
        return t == "submission" or "submission" in name

    def pick_date(match_fn, field, pick="min") -> Optional[str]:
        candidates = []
        for phase in phases:
            if not match_fn(phase):
                continue
            iso = phase.get(field)
            dt = _parse_iso(iso)
            if dt:
                candidates.append((dt, iso))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1] if pick == "min" else candidates[-1][1]

    if not payload.get("registration_open_at"):
        reg_open = pick_date(is_registration, "start_at", pick="min")
        if reg_open:
            payload["registration_open_at"] = reg_open

    if not payload.get("registration_deadline"):
        reg_close = pick_date(is_registration, "end_at", pick="max")
        if reg_close:
            payload["registration_deadline"] = reg_close

    if not payload.get("submission_open_at"):
        sub_open = pick_date(is_submission, "start_at", pick="min")
        if sub_open:
            payload["submission_open_at"] = sub_open

    if not payload.get("submission_deadline"):
        sub_close = pick_date(is_submission, "end_at", pick="max")
        if sub_close:
            payload["submission_deadline"] = sub_close


async def extract_hackathon_details(text: str) -> ExtractResponse:
    try:
        prompt = """Extract hackathon details from the provided text and return ONLY a valid JSON object (no markdown, no extra text) with these fields:

- name: string (hackathon name)
- registration_open_at: ISO datetime string or null (when registration opens/starts)
- registration_deadline: ISO datetime string or null (last date to register)
- submission_open_at: ISO datetime string or null (when project submission opens)
- submission_deadline: ISO datetime string or null (final project submission cutoff)
- phases: array of objects or [] (see schema below)
- location: string (physical location or "Online")
- mode: string ("Online", "Hybrid", or "Offline")
- description: string (max 200 chars summary of the hackathon)

Phases schema:
Each phase is an object with:
- name: string (e.g., "Registration", "Kickoff", "Phase 1 Submission", "Demo Day")
- type: string or null from this list:
  registration, team_formation, ideation, orientation, kickoff, workshop, mentoring,
  hacking, checkpoint, submission, demo, judging, results, other
- start_at: ISO datetime string or null
- end_at: ISO datetime string or null (use as the deadline if only one date is given)

Rules:
- registration_open_at = when signup/registration OPENS (often the hackathon start date)
- registration_deadline = the LAST date/time someone can register (often called "Register by")
- submission_open_at = when participants can START submitting their project
- submission_deadline = the FINAL cutoff to submit the project (most important field)
- If there are multiple rounds/phases (e.g., Phase 1 idea deadline, Phase 2 prototype, Final submission), include each as a separate item in phases with clear names.
- If a field is not clearly mentioned in the text, return null for it
- Do NOT invent or guess dates — only extract what is explicitly stated
- All dates must be in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (use T00:00:00 if time is unknown)
- If only one deadline is mentioned with no context, treat it as submission_deadline
- For phases with a single date (deadline), set end_at and leave start_at null
- Use [] for phases if no phase/round information is present
- Keep phases in chronological order when possible

Return only the JSON object, nothing else."""

        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content([prompt, text])

        response_text = _clean_json_text(response.text)
        hackathon_data = json.loads(response_text)
        phases = _normalize_phases(hackathon_data.get("phases"))
        if phases:
            hackathon_data["phases"] = phases
            _derive_dates_from_phases(hackathon_data, phases)
        else:
            hackathon_data["phases"] = []

        if "description" in hackathon_data:
            desc = hackathon_data.get("description") or ""
            hackathon_data["description"] = str(desc)[:200]
        else:
            hackathon_data["description"] = ""

        return ExtractResponse(**hackathon_data)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Gemini response as JSON using model {GEMINI_MODEL}: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini extraction failed with model {GEMINI_MODEL}: {str(e)}",
        )


@app.post("/api/extract", response_model=ExtractResponse)
async def extract_hackathon(request: ExtractRequest):
    text_to_extract = request.page_text

    if not text_to_extract or len(text_to_extract) < 500:
        try:
            text_to_extract = await extract_with_crawl4ai(request.url)
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=408,
                content={"error": "Extraction timeout. Try manual entry."},
            )

    return await extract_hackathon_details(text_to_extract)


@app.post("/api/hackathons", response_model=HackathonResponse)
async def create_hackathon(
    hackathon: HackathonCreate,
    request: Request,
    x_extension_token: Optional[str] = Header(None),
):
    user_id = await get_current_user(request, x_extension_token)

    try:
        if hackathon.url:
            existing = await (
                supabase
                .table("hackathons")
                .select("id")
                .eq("user_id", user_id)
                .eq("url", hackathon.url)
                .limit(1)
                .execute()
            )

            if existing.data:
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": "Already tracked",
                        "existing_id": existing.data[0]["id"],
                    },
                )

phases = _normalize_phases(hackathon.phases)
payload = {
    "user_id": user_id,
    "name": hackathon.name,
    "url": hackathon.url,
    "registration_open_at": hackathon.registration_open_at,
    "registration_deadline": hackathon.registration_deadline,
    "submission_open_at": hackathon.submission_open_at,
    "submission_deadline": hackathon.submission_deadline,
    "phases": phases or [],
    "location": hackathon.location,
    "mode": hackathon.mode,
    "description": hackathon.description or "",
    "status": hackathon.status,
}

if phases:
    _derive_dates_from_phases(payload, phases)

response = await (
    supabase
    .table("hackathons")
    .insert(payload)
    .execute()
)

        if not response.data:
            raise HTTPException(status_code=500, detail="Hackathon created but no row returned")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create hackathon: {str(e)}")


@app.get("/api/hackathons", response_model=list[HackathonResponse])
async def get_hackathons(
    request: Request,
    x_extension_token: Optional[str] = Header(None),
):
    user_id = await get_current_user(request, x_extension_token)

    try:
        response = await (
            supabase
            .table("hackathons")
            .select("*")
            .eq("user_id", user_id)
            .order("submission_deadline", desc=False)
            .execute()
        )
        hacks = response.data or []

        if not hacks:
            return []

        # Fetch any plans for these hackathons so the frontend can render plan-derived status/priority
        ids = [h.get("id") for h in hacks]
        plans_resp = await (
            supabase
            .table("plans")
            .select("*")
            .in_("hackathon_id", ids)
            .eq("user_id", user_id)
            .execute()
        )
        plans = plans_resp.data or []
        plan_map = {p.get("hackathon_id"): p for p in plans}

        for h in hacks:
            p = plan_map.get(h.get("id"))
            if p:
                h["plan"] = p

        return hacks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hackathons: {str(e)}")


@app.get("/api/notifications")
async def get_notifications(
    request: Request,
    x_extension_token: Optional[str] = Header(None),
):
    user_id = await get_current_user(request, x_extension_token)

    try:
        return await query_urgent_hackathons(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")


@app.put("/api/hackathons/{hackathon_id}/plan", response_model=PlanResponse)
async def upsert_plan(
    hackathon_id: str,
    plan: PlanRequest,
    request: Request,
    x_extension_token: Optional[str] = Header(None),
):
    user_id = await get_current_user(request, x_extension_token)

    try:
        hackathon = await (
            supabase
            .table("hackathons")
            .select("id")
            .eq("id", hackathon_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not hackathon.data:
            raise HTTPException(status_code=404, detail="Hackathon not found or access denied")

        response = await (
            supabase
            .table("plans")
            .upsert(
                {
                    "hackathon_id": hackathon_id,
                    "user_id": user_id,
                    "project_idea": plan.project_idea,
                    "tech_stack": plan.tech_stack,
                    "team_members": plan.team_members,
                    "notes": plan.notes,
                    "priority": plan.priority,
                    "idea_done": getattr(plan, 'idea_done', False),
                    "implementation_done": getattr(plan, 'implementation_done', False),
                    "demo_done": getattr(plan, 'demo_done', False),
                    "submitted": getattr(plan, 'submitted', False),
                },
                on_conflict="hackathon_id",
            )
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=500, detail="Plan saved but no row returned")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upsert plan: {str(e)}")


@app.delete("/api/hackathons/{hackathon_id}")
async def delete_hackathon(
    hackathon_id: str,
    request: Request,
    x_extension_token: Optional[str] = Header(None),
):
    user_id = await get_current_user(request, x_extension_token)

    try:
        response = await (
            supabase
            .table("hackathons")
            .delete()
            .eq("id", hackathon_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Hackathon not found or already deleted")

        return {"message": "Hackathon deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete hackathon: {str(e)}")


@app.post("/api/auth/extension-token", response_model=ExtensionTokenResponse)
async def generate_extension_token(request: Request):
    user_id = await get_current_user_jwt(request)

    try:
        token = secrets.token_urlsafe(32)

        await (
            supabase
            .table("user_tokens")
            .insert({
                "user_id": user_id,
                "token": token,
            })
            .execute()
        )

        return ExtensionTokenResponse(token=token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)