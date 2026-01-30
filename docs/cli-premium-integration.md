# CLI-Premium Integration Architecture

This document describes the integration between the JeffreysPrompts CLI (`jfp`) and the premium SaaS backend.

## Overview

The CLI provides a bridge between the free prompt registry and premium features:

- **Free Tier**: Full access to the public prompt registry, install prompts as Claude Code skills
- **Premium Tier**: Personal library, collections, skills marketplace, sync for offline access

Premium features require an active Pro subscription (**$10/month**) at:
https://pro.jeffreysprompts.com/pricing

The `jfp` CLI itself is open source and free for the public prompt registry.

## Gating Summary (Free vs Pro)

The CLI should always compile and run in public/free mode. Pro is only required for authenticated access to private/premium cloud data.

**Free (no subscription required):**
- `jfp list`, `jfp search`, `jfp show`, `jfp copy`, `jfp export`, `jfp render`, `jfp suggest`
- `jfp bundles`, `jfp bundle`, `jfp categories`, `jfp tags`
- `jfp status`, `jfp refresh`, `jfp open`, `jfp doctor`, `jfp about`, `jfp completion`, `jfp update-cli`
- `jfp i` (interactive browser)

**Premium (paid Pro required):**
- `jfp login`, `jfp logout`, `jfp whoami`
- `jfp save`, `jfp notes`, `jfp collections`, `jfp sync`
- `jfp list --mine`, `jfp search --mine`, `jfp list --saved`, `jfp search --saved`, `jfp search --all`
- `jfp packs` (list/install premium packs)

**Build (free):**
- `bun install`
- `bun run jfp.ts list`
- `bun build --compile ./jfp.ts --outfile jfp`

If a user is not subscribed, Pro commands should return a clear upgrade hint and link to pricing.

## Authentication Flow

### Local Browser-Based Login (Default)

For machines with a display/browser available:

```
1. User runs `jfp login`
2. CLI starts a local HTTP server on a random port
3. CLI opens browser to https://pro.jeffreysprompts.com/cli/auth?port=<port>&redirect=local
4. User authenticates with Google OAuth
5. Premium backend redirects to http://localhost:<port>/callback?token=<jwt>&email=<email>&tier=<tier>
6. CLI receives token and saves to credentials file
```

### Device Code Flow (Headless/SSH)

For headless environments or SSH sessions (RFC 8628 OAuth 2.0 Device Authorization Grant):

```
1. User runs `jfp login --remote`
2. CLI requests device code from POST /api/cli/device-code
3. Backend returns { device_code, user_code, verification_url }
4. CLI displays: "Visit https://pro.jeffreysprompts.com/cli/verify and enter code: XXXX-YYYY"
5. User visits URL, enters code, authenticates with Google
6. CLI polls POST /api/cli/device-token with device_code
7. Backend returns { access_token, refresh_token, expires_at, email, tier, user_id }
8. CLI saves credentials
```

### Token Refresh

```
1. Before each authenticated request, CLI checks if token is expired
2. If expired and refresh_token exists, CLI calls POST /api/cli/token/refresh
3. Backend returns new access_token (and optionally new refresh_token)
4. CLI updates stored credentials atomically
5. If refresh fails, user must re-authenticate
```

### Environment Variable Override

For CI/CD pipelines:

```bash
export JFP_TOKEN="your-access-token"
jfp list --mine  # Uses JFP_TOKEN instead of stored credentials
```

## API Endpoints

All endpoints are prefixed with `/api/cli/` on the premium backend (`https://pro.jeffreysprompts.com`).

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/device-code` | POST | Initiate device code flow |
| `/device-token` | POST | Poll for token during device code flow |
| `/token/refresh` | POST | Refresh an expired access token |
| `/me` | GET | Verify token and get user info |

### Library & Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync` | GET | Sync user's saved prompts (supports incremental via `?since=`) |
| `/saved-prompts` | GET | List user's saved prompts |
| `/saved-prompts` | POST | Save a prompt to user's library |

### Premium Packs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/premium-packs` | GET | List premium packs (optional `?installed=true`) |
| `/premium-packs/:id` | GET | Get premium pack details and prompts |
| `/premium-packs/:id/install` | POST | Install a premium pack |
| `/premium-packs/:id/install` | DELETE | Uninstall a premium pack |

### Collections

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collections` | GET | List user's collections |
| `/collections` | POST | Create a new collection |
| `/collections/:name` | GET | Get collection details with prompts |
| `/collections/:name/add` | POST | Add a prompt to a collection |

### Skills Marketplace

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/skills` | GET | List available skills (filters: tool, category, search) |
| `/skills/:id` | GET | Get skill details |
| `/skills/:id/install` | POST | Record skill installation |
| `/skills/:id/export` | GET | Download skill as SKILL.md |

## Local Cache Structure

All CLI data is stored in XDG-compliant directories:

```
~/.config/jfp/
├── credentials.json       # Auth tokens (mode 0600)
├── config.json           # CLI configuration
├── registry/             # Prompt registry cache
│   ├── prompts.json     # Cached registry data
│   └── meta.json        # Cache metadata (ETag, timestamp)
└── library/              # Synced premium library
    ├── prompts.json     # User's saved prompts
    └── sync.meta.json   # Sync metadata

~/.config/claude/skills/  # Personal Claude Code skills
├── idea-wizard/
│   └── SKILL.md
└── manifest.json         # Tracks installed skills

.claude/skills/           # Project-level skills (per-project)
├── custom-skill/
│   └── SKILL.md
└── manifest.json
```

### credentials.json

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

### sync.meta.json

```json
{
  "lastSync": "2026-01-12T12:00:00.000Z",
  "promptCount": 42,
  "version": "1.0.0"
}
```

### manifest.json (Skills)

```json
{
  "generatedAt": "2026-01-12T12:00:00.000Z",
  "jfpVersion": "1.0.0",
  "entries": [
    {
      "id": "idea-wizard",
      "kind": "prompt",
      "version": "1.0.0",
      "hash": "sha256:abc123..."
    }
  ]
}
```

## Prompt Format Compatibility

### Free Tier (TypeScript Registry)

Prompts in `packages/core/src/prompts/registry.ts`:

```typescript
{
  id: "idea-wizard",
  title: "The Idea Wizard",
  description: "Generate improvement ideas",
  category: "ideation",
  tags: ["brainstorming", "ultrathink"],
  author: "Jeffrey Emanuel",
  version: "1.0.0",
  content: "Come up with your very best ideas...",
  whenToUse: ["When starting a new feature"],
  tips: ["Use at session start"],
}
```

### Premium Tier (Database)

User-created prompts stored in PostgreSQL:

```typescript
{
  id: "uuid",
  user_id: "uuid",
  title: "My Custom Prompt",
  content: "...",
  category: "workflow",
  tags: ["custom"],
  visibility: "private" | "public",
  created_at: "timestamp",
  updated_at: "timestamp",
}
```

### SKILL.md Export Format

Both formats export to Claude Code SKILL.md:

```markdown
---
name: idea-wizard
description: Generate improvement ideas
version: 1.0.0
author: Jeffrey Emanuel
category: ideation
tags: ["brainstorming", "ultrathink"]
source: https://jeffreysprompts.com/prompts/idea-wizard
x_jfp_generated: true
---

# The Idea Wizard

Come up with your very best ideas...

## When to Use

- When starting a new feature

## Tips

- Use at session start

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com/prompts/idea-wizard)*
```

## Offline Mode

### What Works Offline

| Feature | Offline Behavior |
|---------|-----------------|
| `jfp list` | Uses bundled registry |
| `jfp search` | Searches bundled registry |
| `jfp show <id>` | Shows from bundled registry |
| `jfp install` | Installs from bundled registry |
| `jfp list --mine` | Uses synced library cache |
| `jfp search --mine` | Searches synced library |
| `jfp collections` | Uses synced collections |
| `jfp sync` | Requires network |
| `jfp login` | Requires network |
| `jfp skills` | Requires network |

### Cache Invalidation

Registry cache uses stale-while-revalidate strategy:

1. On first request, fetch from remote and cache
2. On subsequent requests, return cache immediately
3. Background revalidation if cache is stale (>1 hour)
4. ETag-based validation to minimize bandwidth
5. Fall back to bundled registry if network fails

### Sync Conflict Resolution

The sync command uses incremental updates:

1. Client sends `?since=<lastSync>` timestamp
2. Server returns only prompts modified since that time
3. Client merges: server versions overwrite local, new prompts added
4. Force sync (`--force`) downloads everything fresh

## Security

### Token Storage

- Credentials stored with file mode 0600 (user read/write only)
- Config directory created with mode 0700
- Atomic writes via temp file + rename
- No sensitive data in logs (debug mode masks tokens)

### API Security

- All endpoints use HTTPS
- Bearer token authentication
- Tokens expire after 24 hours
- Refresh tokens for seamless re-authentication
- Rate limiting on authentication endpoints

### XSS Prevention

- HTML in callback pages escaped
- User input never rendered in HTML without escaping

## Error Handling

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not found / General error |
| 2 | Invalid arguments |
| 3 | Installation failed |
| 4 | Network error |
| 5 | Permission denied |

### JSON Error Format

All commands support `--json` for machine-readable output:

```json
{
  "error": true,
  "code": "not_authenticated",
  "message": "Please log in to access this feature",
  "hint": "Run 'jfp login' to sign in"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `not_authenticated` | User not logged in |
| `session_expired` | Token expired, refresh failed |
| `requires_premium` | Feature requires premium subscription |
| `not_found` | Resource not found |
| `network_error` | Network request failed |
| `timeout` | Operation timed out |

## Troubleshooting

### Login Issues

**"Could not open browser"**
- Use `jfp login --remote` for device code flow
- Set `DISPLAY` environment variable on Linux

**"Device code expired"**
- User must complete authentication within 5 minutes
- Run `jfp login --remote` again

**"Session expired"**
- Run `jfp logout` then `jfp login`
- Check system clock is correct

### Sync Issues

**"Library sync requires premium"**
- Upgrade at https://pro.jeffreysprompts.com

**"Failed to sync: Network error"**
- Check internet connection
- Check if pro.jeffreysprompts.com is accessible

**Stale library data**
- Run `jfp sync --force` for full re-sync
- Check `jfp sync --status` for last sync time

### Debug Mode

Enable debug logging:

```bash
JFP_DEBUG=1 jfp sync
```

This logs:
- Token refresh attempts
- API request/response details
- Cache operations

## Cross-Repository Integration

The CLI integrates with the premium backend through these beads:

| CLI Feature | Premium Backend |
|-------------|-----------------|
| Device code auth | jeffreysprompts_premium-0o1 |
| Verification page | jeffreysprompts_premium-qdm |
| CLI auth page | jeffreysprompts_premium-mn0 |
| JWT generation | jeffreysprompts_premium-qnl |
| Token refresh/revoke | jeffreysprompts_premium-0ve |
| Sync endpoints | jeffreysprompts_premium-67o |
| Skills API | jeffreysprompts_premium-6x3 |

See `AGENTS.md` (section "CLI Cross-Repo Dependency Matrix") for the complete dependency matrix.
