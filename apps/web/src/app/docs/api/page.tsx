import type { Metadata } from "next";
import { DocsPageLayout } from "@/components/docs/DocsPageLayout";
import { CodeBlock, CodeTabs } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "API Documentation | JeffreysPrompts",
  description: "Complete API reference for JeffreysPrompts.com. Learn how to programmatically access prompts, download skills, and integrate with your tools.",
};

const tableOfContents = [
  { id: "introduction", title: "Introduction" },
  { id: "base-url", title: "Base URL", level: 2 },
  { id: "authentication", title: "Authentication" },
  { id: "prompts", title: "Prompts" },
  { id: "get-prompts", title: "List Prompts", level: 2 },
  { id: "skills", title: "Skills" },
  { id: "get-skill", title: "Download Skill", level: 2 },
  { id: "share", title: "Share Links" },
  { id: "create-share", title: "Create Share Link", level: 2 },
  { id: "get-share", title: "Access Shared Content", level: 2 },
  { id: "health", title: "Health Endpoints" },
  { id: "errors", title: "Error Handling" },
  { id: "rate-limits", title: "Rate Limits" },
];

export default function ApiDocsPage() {
  return (
    <DocsPageLayout
      title="API Documentation"
      description="Complete reference for the JeffreysPrompts API. Designed for CLI tools, integrations, and programmatic access."
      version="1.0.0"
      tableOfContents={tableOfContents}
    >
      {/* Introduction */}
      <section id="introduction">
        <h2>Introduction</h2>
        <p>
          The JeffreysPrompts API provides programmatic access to the prompt registry,
          skill downloads, and platform features. It&apos;s designed for:
        </p>
        <ul>
          <li><strong>CLI Tools</strong> - The <code>jfp</code> CLI uses this API</li>
          <li><strong>Integrations</strong> - Build tools that work with JeffreysPrompts</li>
          <li><strong>Automation</strong> - Script prompt management workflows</li>
        </ul>

        <h3 id="base-url">Base URL</h3>
        <p>All API requests should be made to:</p>
        <CodeBlock code="https://jeffreysprompts.com/api" language="text" />
      </section>

      {/* Authentication */}
      <section id="authentication">
        <h2>Authentication</h2>
        <p>
          Public endpoints (prompts, skills, health) require no authentication.
          Premium features require authentication via the CLI login flow.
        </p>

        <h3>Public Endpoints (No Auth Required)</h3>
        <ul>
          <li><code>GET /prompts</code> - List all prompts</li>
          <li><code>GET /skills/:id</code> - Download skill files</li>
          <li><code>GET /health/*</code> - Health checks</li>
        </ul>

        <h3>Premium Endpoints (Auth Required)</h3>
        <p>
          For premium features, authenticate using the CLI:
        </p>
        <CodeBlock
          code="jfp login"
          language="bash"
        />
        <p>
          This initiates a device code flow that opens your browser for authentication.
          Tokens are stored securely at <code>~/.config/jfp/credentials.json</code>.
        </p>
      </section>

      {/* Prompts */}
      <section id="prompts">
        <h2>Prompts</h2>
        <p>
          Access the full prompt registry with filtering and caching support.
        </p>

        <h3 id="get-prompts">List Prompts</h3>
        <p>
          <code>GET /prompts</code>
        </p>
        <p>
          Returns all prompts with optional filtering. Supports ETag-based caching
          for efficient polling.
        </p>

        <h4>Query Parameters</h4>
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>category</code></td>
              <td>string</td>
              <td>Filter by category (e.g., <code>ideation</code>, <code>automation</code>)</td>
            </tr>
            <tr>
              <td><code>tag</code></td>
              <td>string</td>
              <td>Filter by tag</td>
            </tr>
            <tr>
              <td><code>featured</code></td>
              <td>&quot;true&quot;</td>
              <td>Only return featured prompts</td>
            </tr>
            <tr>
              <td><code>minimal</code></td>
              <td>&quot;true&quot;</td>
              <td>Return minimal data (id, title, category, tags only)</td>
            </tr>
          </tbody>
        </table>

        <h4>Example Request</h4>
        <CodeTabs
          tabs={[
            {
              label: "curl",
              language: "bash",
              code: `curl -s "https://jeffreysprompts.com/api/prompts?category=ideation" | jq '.prompts[0]'`,
            },
            {
              label: "JavaScript",
              language: "javascript",
              code: `const response = await fetch('https://jeffreysprompts.com/api/prompts?category=ideation');
const { prompts } = await response.json();
console.log(prompts[0]);`,
            },
            {
              label: "Python",
              language: "python",
              code: `import requests

response = requests.get('https://jeffreysprompts.com/api/prompts', params={'category': 'ideation'})
prompts = response.json()['prompts']
print(prompts[0])`,
            },
          ]}
        />

        <h4>Response</h4>
        <CodeBlock
          language="json"
          code={`{
  "prompts": [
    {
      "id": "idea-wizard",
      "title": "The Idea Wizard",
      "description": "Generate 30 ideas, rigorously evaluate, distill to best 5",
      "category": "ideation",
      "tags": ["brainstorming", "improvement", "ultrathink"],
      "author": "Jeffrey Emanuel",
      "version": "1.0.0",
      "featured": true,
      "content": "Come up with your very best ideas..."
    }
  ],
  "meta": {
    "version": "1.0.0",
    "promptCount": 50,
    "categories": ["ideation", "documentation", ...],
    "tags": ["brainstorming", "ultrathink", ...]
  }
}`}
        />

        <h4>Caching</h4>
        <p>
          The API returns an <code>ETag</code> header. Use <code>If-None-Match</code>
          to get a <code>304 Not Modified</code> response when content hasn&apos;t changed:
        </p>
        <CodeBlock
          language="bash"
          code={`# First request - get ETag
curl -sI "https://jeffreysprompts.com/api/prompts" | grep etag
# etag: "dj...=="

# Subsequent request - use If-None-Match
curl -s -o /dev/null -w "%{http_code}" \\
  -H "If-None-Match: \\"dj...\\"" \\
  "https://jeffreysprompts.com/api/prompts"
# 304`}
        />
      </section>

      {/* Skills */}
      <section id="skills">
        <h2>Skills</h2>
        <p>
          Download prompts as Claude Code SKILL.md files for direct installation.
        </p>

        <h3 id="get-skill">Download Skill</h3>
        <p>
          <code>GET /skills/:id</code>
        </p>
        <p>
          Returns a SKILL.md file that can be saved directly to your Claude Code
          skills directory.
        </p>

        <h4>Example Request</h4>
        <CodeTabs
          tabs={[
            {
              label: "curl",
              language: "bash",
              code: `# Download to Claude Code skills directory
curl -s "https://jeffreysprompts.com/api/skills/idea-wizard" \\
  -o ~/.config/claude/skills/idea-wizard/SKILL.md`,
            },
            {
              label: "jfp CLI",
              language: "bash",
              code: `# Using the jfp CLI (recommended)
jfp install idea-wizard

# Install all skills
jfp install --all`,
            },
          ]}
        />

        <h4>Response</h4>
        <p>
          Returns <code>text/markdown</code> with <code>Content-Disposition</code> header:
        </p>
        <CodeBlock
          language="markdown"
          code={`---
name: idea-wizard
description: Generate 30 ideas, rigorously evaluate, distill to best 5
---

# The Idea Wizard

Come up with your very best ideas for improving this project...

## When to Use
- When starting a new feature or project
- When reviewing a codebase for improvements

## Tips
- Run this at the start of a session for fresh perspective
- Combine with ultrathink for deeper analysis`}
        />

        <h4>Error Response (404)</h4>
        <CodeBlock
          language="json"
          code={`{
  "error": "not_found",
  "message": "Prompt 'foo-bar' not found"
}`}
        />
      </section>

      {/* Share Links */}
      <section id="share">
        <h2>Share Links</h2>
        <p>
          Create shareable links for prompts, bundles, and workflows.
        </p>

        <h3 id="create-share">Create Share Link</h3>
        <p>
          <code>POST /share</code>
        </p>

        <h4>Request Body</h4>
        <CodeBlock
          language="json"
          code={`{
  "contentType": "prompt",
  "contentId": "idea-wizard",
  "password": "optional-password",
  "expiresIn": 30
}`}
        />

        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>contentType</code></td>
              <td>string</td>
              <td>Yes</td>
              <td><code>prompt</code>, <code>bundle</code>, <code>workflow</code>, or <code>collection</code></td>
            </tr>
            <tr>
              <td><code>contentId</code></td>
              <td>string</td>
              <td>Yes</td>
              <td>ID of the content to share</td>
            </tr>
            <tr>
              <td><code>password</code></td>
              <td>string</td>
              <td>No</td>
              <td>Optional password protection (max 64 chars)</td>
            </tr>
            <tr>
              <td><code>expiresIn</code></td>
              <td>integer</td>
              <td>No</td>
              <td>Days until expiration (max 365)</td>
            </tr>
          </tbody>
        </table>

        <h4>Response</h4>
        <CodeBlock
          language="json"
          code={`{
  "linkCode": "abc123xyz789",
  "url": "https://jeffreysprompts.com/share/abc123xyz789",
  "expiresAt": "2026-02-11T00:00:00.000Z"
}`}
        />

        <h3 id="get-share">Access Shared Content</h3>
        <p>
          <code>GET /share/:code</code>
        </p>
        <p>
          Returns the shared content. If password-protected, returns <code>401</code>
          with <code>{`{"requiresPassword": true}`}</code>.
        </p>

        <h4>Response</h4>
        <CodeBlock
          language="json"
          code={`{
  "link": {
    "code": "abc123xyz789",
    "contentType": "prompt",
    "contentId": "idea-wizard",
    "viewCount": 42,
    "expiresAt": "2026-02-11T00:00:00.000Z"
  },
  "content": {
    "id": "idea-wizard",
    "title": "The Idea Wizard",
    ...
  }
}`}
        />
      </section>

      {/* Health */}
      <section id="health">
        <h2>Health Endpoints</h2>
        <p>
          Monitor service health and readiness.
        </p>

        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET /health</code></td>
              <td>Basic health check with prompt stats</td>
            </tr>
            <tr>
              <td><code>GET /health/ready</code></td>
              <td>Kubernetes-style readiness probe</td>
            </tr>
            <tr>
              <td><code>GET /health/status</code></td>
              <td>Detailed status including memory and uptime</td>
            </tr>
          </tbody>
        </table>

        <h4>Example: Basic Health Check</h4>
        <CodeBlock
          language="bash"
          code={`curl -s "https://jeffreysprompts.com/api/health" | jq`}
        />
        <CodeBlock
          language="json"
          code={`{
  "status": "ok",
  "timestamp": "2026-01-12T12:00:00.000Z",
  "version": "1.0.0",
  "prompts": {
    "count": 50,
    "categories": 8,
    "tags": 25
  },
  "environment": "production"
}`}
        />
      </section>

      {/* Error Handling */}
      <section id="errors">
        <h2>Error Handling</h2>
        <p>
          All errors return JSON with an <code>error</code> field:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "error": "Error message describing what went wrong"
}`}
        />

        <h3>HTTP Status Codes</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>200</code></td>
              <td>Success</td>
            </tr>
            <tr>
              <td><code>304</code></td>
              <td>Not Modified (use cached version)</td>
            </tr>
            <tr>
              <td><code>400</code></td>
              <td>Bad Request (invalid parameters or body)</td>
            </tr>
            <tr>
              <td><code>401</code></td>
              <td>Unauthorized (auth required or password needed)</td>
            </tr>
            <tr>
              <td><code>404</code></td>
              <td>Not Found</td>
            </tr>
            <tr>
              <td><code>409</code></td>
              <td>Conflict (e.g., duplicate report)</td>
            </tr>
            <tr>
              <td><code>410</code></td>
              <td>Gone (e.g., expired share link)</td>
            </tr>
            <tr>
              <td><code>429</code></td>
              <td>Rate Limit Exceeded</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Rate Limits */}
      <section id="rate-limits">
        <h2>Rate Limits</h2>
        <p>
          Rate limits apply to certain endpoints to prevent abuse:
        </p>

        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Limit</th>
              <th>Window</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>POST /reports</code></td>
              <td>10 requests</td>
              <td>24 hours per IP</td>
            </tr>
            <tr>
              <td><code>POST /support/tickets</code></td>
              <td>5 requests</td>
              <td>24 hours per IP/email</td>
            </tr>
          </tbody>
        </table>

        <p>
          When rate limited, the response includes a <code>Retry-After</code> header
          indicating seconds until the limit resets:
        </p>
        <CodeBlock
          language="json"
          code={`HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "Rate limit exceeded. Please try again later."
}`}
        />
      </section>
    </DocsPageLayout>
  );
}
