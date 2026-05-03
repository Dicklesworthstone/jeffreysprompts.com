# CLI API Reference

API endpoints used by the JeffreysPrompts CLI (`jfp`).

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://pro.jeffreysprompts.com/api/cli` |
| Public Registry | `https://jeffreysprompts.com/api` |

## Authentication

Most premium endpoints require authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

## Public Registry API

### GET /api/prompts

List all prompts from the public registry.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category |
| `tag` | string | Filter by tag |
| `featured` | boolean | Only featured prompts |
| `minimal` | boolean | Return minimal metadata only |

**Response:**

```json
{
  "prompts": [
    {
      "id": "idea-wizard",
      "title": "The Idea Wizard",
      "description": "Generate improvement ideas",
      "category": "ideation",
      "tags": ["brainstorming", "ultrathink"],
      "author": "Jeffrey Emanuel",
      "version": "1.0.0",
      "featured": true,
      "content": "..."
    }
  ],
  "meta": {
    "count": 45,
    "categories": ["ideation", "documentation", ...],
    "tags": ["ultrathink", "brainstorming", ...]
  }
}
```

**Caching:**
- `ETag` header for cache validation
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-12T12:00:00Z",
  "version": "1.0.0",
  "prompts": {
    "count": 45,
    "categories": 8,
    "tags": 120
  }
}
```

---

## Premium CLI API

All endpoints below are prefixed with `/api/cli` on `pro.jeffreysprompts.com`.

### Authentication Endpoints

#### POST /device-code

Initiate device code authentication flow.

**Request:**

```json
{
  "client_id": "jfp-cli"
}
```

**Response:**

```json
{
  "device_code": "internal-code-for-polling",
  "user_code": "XYZW-1234",
  "verification_url": "https://pro.jeffreysprompts.com/cli/verify",
  "expires_in": 300,
  "interval": 2
}
```

#### POST /device-token

Poll for token during device code flow.

**Request:**

```json
{
  "device_code": "internal-code-for-polling",
  "client_id": "jfp-cli"
}
```

**Success Response (200):**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_at": "2026-01-13T12:00:00.000Z",
  "email": "user@example.com",
  "tier": "premium",
  "user_id": "uuid"
}
```

**Pending Response (400):**

```json
{
  "error": "authorization_pending",
  "error_description": "User has not completed authentication"
}
```

**Other Errors:**

| Error Code | Description |
|------------|-------------|
| `slow_down` | Polling too fast, wait 5s |
| `expired_token` | Device code expired |
| `access_denied` | User denied authorization |

#### POST /token/refresh

Refresh an expired access token.

**Request:**

```json
{
  "refresh_token": "eyJ...",
  "client_id": "jfp-cli"
}
```

**Response:**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_at": "2026-01-13T12:00:00.000Z",
  "email": "user@example.com",
  "tier": "premium",
  "user_id": "uuid"
}
```

#### GET /me

Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "email": "user@example.com",
  "tier": "premium",
  "user_id": "uuid"
}
```

---

### Library & Sync Endpoints

#### GET /prompts

List the user's prompts. `jfp sync` uses this endpoint page by page to refresh the local offline cache.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number, starting at 1 |
| `limit` | number | Page size, capped by the premium API |
| `visibility` | string | Optional `private`, `public`, or `link_only` filter |

**Response:**

```json
{
  "prompts": [
    {
      "id": "uuid",
      "title": "My Prompt",
      "content": "...",
      "category": "workflow",
      "tags": ["custom"],
      "createdAt": "2026-01-12T11:30:00Z",
      "updatedAt": "2026-01-12T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 42,
    "hasMore": false
  }
}
```

`GET /sync` is kept only as a legacy compatibility fallback for older installed CLIs.

#### GET /saved-prompts

List user's saved prompts.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "prompts": [...],
  "total": 42
}
```

#### POST /saved-prompts

Save a prompt to user's library.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "prompt_id": "idea-wizard"
}
```

**Response (201):**

```json
{
  "saved": true,
  "prompt_id": "idea-wizard",
  "title": "The Idea Wizard",
  "saved_at": "2026-01-12T12:00:00Z"
}
```

**Conflict (409):**

```json
{
  "error": true,
  "code": "already_saved",
  "message": "Prompt already saved"
}
```

---

### Collections Endpoints

#### GET /collections

List user's collections.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "collections": [
    {
      "id": "uuid",
      "name": "my-favorites",
      "description": "My favorite prompts",
      "prompt_count": 5,
      "created_at": "2026-01-12T12:00:00Z"
    }
  ],
  "total": 3
}
```

#### POST /collections

Create a new collection.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "name": "my-favorites",
  "description": "My favorite prompts"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "my-favorites",
  "description": "My favorite prompts",
  "created_at": "2026-01-12T12:00:00Z"
}
```

#### GET /collections/:name

Get collection details with prompts.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "id": "uuid",
  "name": "my-favorites",
  "description": "My favorite prompts",
  "prompts": [
    {
      "id": "idea-wizard",
      "title": "The Idea Wizard",
      "added_at": "2026-01-12T12:00:00Z"
    }
  ],
  "created_at": "2026-01-12T12:00:00Z"
}
```

#### POST /collections/:name/add

Add a prompt to a collection.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "prompt_id": "idea-wizard"
}
```

**Response (201):**

```json
{
  "added": true,
  "collection": "my-favorites",
  "prompt_id": "idea-wizard",
  "added_at": "2026-01-12T12:00:00Z"
}
```

---

### Skills Marketplace Endpoints

#### GET /skills

List available skills from the marketplace.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tool` | string | Filter by tool (e.g., "claude-code") |
| `category` | string | Filter by category |
| `mine` | boolean | Only user's skills |
| `search` | string | Search query |
| `limit` | number | Max results (default: 20) |

**Response:**

```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "code-reviewer",
      "description": "Comprehensive code review",
      "tool": "claude-code",
      "category": "review",
      "author": "Jane Doe",
      "version": "1.0.0",
      "downloads": 1234,
      "rating": 4.5,
      "created_at": "2026-01-12T12:00:00Z"
    }
  ],
  "total": 50
}
```

#### GET /skills/:id

Get skill details.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "id": "uuid",
  "name": "code-reviewer",
  "description": "Comprehensive code review",
  "tool": "claude-code",
  "category": "review",
  "content": "Full skill content...",
  "author": "Jane Doe",
  "version": "1.0.0",
  "when_to_use": ["When reviewing PRs"],
  "tips": ["Focus on security issues"],
  "downloads": 1234,
  "rating": 4.5
}
```

#### POST /skills/:id/install

Record skill installation.

**Headers:** `Authorization: Bearer <token>`

**Response (201):**

```json
{
  "installed": true,
  "skill_id": "uuid",
  "skill_name": "code-reviewer",
  "installed_at": "2026-01-12T12:00:00Z"
}
```

**Conflict (409):**

```json
{
  "error": true,
  "code": "already_installed",
  "message": "Skill already installed"
}
```

#### GET /skills/:id/export

Export skill as SKILL.md file.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "skill_id": "uuid",
  "skill_name": "code-reviewer",
  "content": "---\nname: code-reviewer\n...",
  "format": "skill.md"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": true,
  "code": "error_code",
  "message": "Human-readable message"
}
```

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `not_authenticated` | 401 | No valid token provided |
| `session_expired` | 401 | Token expired, refresh required |
| `requires_premium` | 403 | Feature requires premium tier |
| `not_found` | 404 | Resource not found |
| `already_exists` | 409 | Resource already exists |
| `validation_error` | 400 | Invalid request parameters |
| `rate_limited` | 429 | Too many requests |
| `server_error` | 500 | Internal server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/device-code` | 10/minute |
| `/device-token` | 60/minute |
| `/prompts` | 100/minute |
| `/sync` | 10/minute legacy compatibility fallback |
| Other endpoints | 100/minute |

Rate limit headers:
- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Window reset timestamp

---

## Versioning

The API is versioned via URL path. Current version: `v1` (implicit).

Breaking changes will introduce a new version path (e.g., `/api/v2/cli`).

---

## SDK Usage

The CLI uses `@jeffreysprompts/cli/lib/api-client` for all requests:

```typescript
import { apiClient } from "./lib/api-client";

// GET request
const response = await apiClient.get<PromptsResponse>("/cli/prompts?page=1&limit=100");
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}

// POST request
const response = await apiClient.post<SaveResponse>(
  "/cli/saved-prompts",
  { prompt_id: "idea-wizard" }
);
```

The `apiClient` automatically:
- Adds `Authorization` header if logged in
- Handles token refresh when expired
- Provides typed responses
- Includes timeout handling
