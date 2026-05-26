# Hackathon Tracker API Documentation

Complete API reference for the Hackathon Tracker backend.

## Base URL

```
http://localhost:8000
```

## Authentication Methods

### 1. JWT (Supabase Auth)
For authenticated endpoints, include the JWT token in the Authorization header:

```bash
Authorization: Bearer <jwt_token>
```

### 2. Extension Token
For Chrome extension requests, include the token in a custom header:

```bash
X-Extension-Token: <extension_token>
```

Both methods work interchangeably for most endpoints (except `/api/auth/extension-token` which requires JWT).

---

## Endpoints

### 1. POST /api/extract

Extract hackathon details from a URL or provided text using Gemini AI.

**Authentication**: None required (optional extension token)

**Request Body**:
```json
{
  "url": "https://hackathon-website.com/details",
  "title": "HackathonName 2024",
  "page_text": null
}
```

**Parameters**:
- `url` (string, required): The URL to extract from
- `title` (string, required): Display title for the hackathon
- `page_text` (string, optional): Pre-fetched HTML/markdown. If > 500 chars, this will be used instead of crawling

**Response** (200 OK):
```json
{
  "name": "HackathonName 2024",
  "registration_open_at": "2024-05-01T00:00:00Z",
  "registration_deadline": "2024-05-15T23:59:59Z",
  "submission_open_at": "2024-05-20T00:00:00Z",
  "submission_deadline": "2024-06-01T23:59:59Z",
  "phases": [
    { "name": "Registration", "type": "registration", "start_at": "2024-05-01T00:00:00Z", "end_at": "2024-05-15T23:59:59Z" },
    { "name": "Phase 1 Submission", "type": "submission", "start_at": "2024-05-20T00:00:00Z", "end_at": "2024-05-25T23:59:59Z" },
    { "name": "Final Submission", "type": "submission", "start_at": null, "end_at": "2024-06-01T23:59:59Z" }
  ],
  "location": "San Francisco, CA",
  "mode": "Hybrid",
  "description": "Join us for 48 hours of coding, innovation, and networking."
}
```

**Error Responses**:
- 500: Crawl4AI or Gemini extraction failed

---

### 2. POST /api/hackathons

Create a new hackathon entry in your list.

**Authentication**: Required (JWT or Extension Token)

**Request Body**:
```json
{
  "name": "HackathonName 2024",
  "url": "https://hackathon-website.com",
  "registration_open_at": "2024-05-01T00:00:00Z",
  "registration_deadline": "2024-05-15T23:59:59Z",
  "submission_open_at": "2024-05-20T00:00:00Z",
  "submission_deadline": "2024-06-01T23:59:59Z",
  "phases": [
    { "name": "Registration", "type": "registration", "start_at": "2024-05-01T00:00:00Z", "end_at": "2024-05-15T23:59:59Z" },
    { "name": "Final Submission", "type": "submission", "start_at": null, "end_at": "2024-06-01T23:59:59Z" }
  ],
  "location": "San Francisco, CA",
  "mode": "Hybrid",
  "description": "Join us for 48 hours of coding.",
  "status": "interested"
}
```

**Parameters**:
- `name` (string, required): Hackathon name
- `url` (string, required): Hackathon website URL
- `registration_open_at` (ISO string, optional): Registration opening date
- `registration_deadline` (ISO string, optional): Registration deadline
- `submission_open_at` (ISO string, optional): Submission opening date
- `submission_deadline` (ISO string, optional): Submission deadline
- `phases` (array, optional): Phase timeline objects (name/type/start_at/end_at)
- `location` (string, required): Physical location or "Online"
- `mode` (string, required): "Online", "Hybrid", or "Offline"
- `description` (string, required): Short description (max 200 chars)
- `status` (string, default: "interested"): One of: "interested", "registered", "completed", "dropped"

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid",
  "name": "HackathonName 2024",
  "url": "https://hackathon-website.com",
  "registration_open_at": "2024-05-01T00:00:00Z",
  "registration_deadline": "2024-05-15T23:59:59Z",
  "submission_open_at": "2024-05-20T00:00:00Z",
  "submission_deadline": "2024-06-01T23:59:59Z",
  "phases": [
    { "name": "Registration", "type": "registration", "start_at": "2024-05-01T00:00:00Z", "end_at": "2024-05-15T23:59:59Z" },
    { "name": "Final Submission", "type": "submission", "start_at": null, "end_at": "2024-06-01T23:59:59Z" }
  ],
  "location": "San Francisco, CA",
  "mode": "Hybrid",
  "description": "Join us for 48 hours of coding.",
  "status": "interested",
  "created_at": "2024-04-01T10:00:00Z",
  "updated_at": "2024-04-01T10:00:00Z"
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Database insertion failed

---

### 3. GET /api/hackathons

Retrieve all hackathons for the current user, ordered by submission deadline.

**Authentication**: Required (JWT or Extension Token)

**Query Parameters**: None

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "name": "HackathonName 2024",
    "url": "https://hackathon-website.com",
    "registration_open_at": "2024-05-01T00:00:00Z",
    "registration_deadline": "2024-05-15T23:59:59Z",
    "submission_open_at": "2024-05-20T00:00:00Z",
    "submission_deadline": "2024-06-01T23:59:59Z",
    "phases": [
      { "name": "Registration", "type": "registration", "start_at": "2024-05-01T00:00:00Z", "end_at": "2024-05-15T23:59:59Z" },
      { "name": "Final Submission", "type": "submission", "start_at": null, "end_at": "2024-06-01T23:59:59Z" }
    ],
    "location": "San Francisco, CA",
    "mode": "Hybrid",
    "description": "Join us for 48 hours of coding.",
    "status": "interested",
    "created_at": "2024-04-01T10:00:00Z",
    "updated_at": "2024-04-01T10:00:00Z"
  }
]
```

**Error Responses**:
- 401: Unauthorized
- 500: Database query failed

---

### 4. PUT /api/hackathons/{id}/plan

Create or update a plan for a specific hackathon (upsert operation).

**Authentication**: Required (JWT or Extension Token)

**Path Parameters**:
- `id` (string, required): Hackathon UUID

**Request Body**:
```json
{
  "project_idea": "AI-powered recipe recommendation system",
  "tech_stack": ["Python", "FastAPI", "TensorFlow", "React"],
  "team_members": ["Alice", "Bob", "Charlie"],
  "notes": "Focus on mobile-first design",
  "priority": "high"
}
```

**Parameters**:
- `project_idea` (string, required): Description of the project idea
- `tech_stack` (array of strings, required): Technologies to use
- `team_members` (array of strings, required): Team member names
- `notes` (string, optional): Additional notes
- `priority` (string, optional): Priority level

**Response** (200 OK):
```json
{
  "id": "plan-uuid",
  "hackathon_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid",
  "project_idea": "AI-powered recipe recommendation system",
  "tech_stack": ["Python", "FastAPI", "TensorFlow", "React"],
  "team_members": ["Alice", "Bob", "Charlie"],
  "notes": "Focus on mobile-first design",
  "priority": "high",
  "created_at": "2024-04-01T10:00:00Z",
  "updated_at": "2024-04-01T10:00:00Z"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Hackathon not found or access denied
- 500: Database upsert failed

---

### 5. DELETE /api/hackathons/{id}

Delete a hackathon from your list.

**Authentication**: Required (JWT or Extension Token)

**Path Parameters**:
- `id` (string, required): Hackathon UUID

**Response** (200 OK):
```json
{
  "message": "Hackathon deleted successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Hackathon not found or already deleted
- 500: Database deletion failed

---

### 6. POST /api/auth/extension-token

Generate a new extension token for use with the Chrome extension.

**Authentication**: Required (JWT only)

**Request Body**: Empty

**Response** (200 OK):
```json
{
  "token": "Z0lCZFJ5MjhUQjJXT3N2X0pPRXlLWWFNUzJpVWJFN0k"
}
```

Store this token in the extension and use it in the `X-Extension-Token` header for subsequent requests.

**Error Responses**:
- 401: JWT required (extension token not accepted)
- 500: Token generation failed

---

### 7. GET /health

Health check endpoint to verify the API is running.

**Authentication**: None required

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid data) |
| 401 | Unauthorized (missing/invalid auth) |
| 404 | Not Found |
| 500 | Server Error |

---

## Example Usage

### Extract a hackathon

```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/hackathon",
    "title": "Example Hackathon",
    "page_text": null
  }'
```

### Create a hackathon (with JWT)

```bash
curl -X POST http://localhost:8000/api/hackathons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Hackathon",
    "url": "https://example.com/hackathon",
    "location": "Online",
    "mode": "Online",
    "description": "A cool hackathon",
    "status": "interested"
  }'
```

### Get all hackathons

```bash
curl -X GET http://localhost:8000/api/hackathons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate an extension token (with JWT)

```bash
curl -X POST http://localhost:8000/api/auth/extension-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Use extension token for subsequent requests

```bash
curl -X GET http://localhost:8000/api/hackathons \
  -H "X-Extension-Token: Z0lCZFJ5MjhUQjJXT3N2X0pPRXlLWWFNUzJpVWJFN0k"
```

---

## CORS

The API allows requests from:
- `chrome-extension://*` (Chrome extension)
- `http://localhost:5173` (Frontend dev server)
- `http://localhost:3000` (Alternative frontend)

---

## Rate Limiting

Currently no rate limiting is implemented. This should be added in production.

---

## Best Practices

1. **Store tokens securely** - Never commit tokens to version control
2. **Use extension tokens for extension requests** - Separate concerns
3. **Validate on the frontend** - Don't rely only on backend validation
4. **Handle errors gracefully** - Always check response status codes
5. **Cache extraction results** - Avoid re-extracting the same hackathon
