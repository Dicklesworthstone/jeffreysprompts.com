/**
 * jfp serve - MCP server mode
 *
 * Exposes JeffreysPrompts via Model Context Protocol (MCP) for agent-native access.
 *
 * Resources:
 *   prompt://<id> - Returns the rendered prompt content
 *
 * Tools:
 *   search_prompts - Search prompts by query, category, tags
 *   render_prompt - Render a prompt with variables and context
 *
 * Usage:
 *   jfp serve              # Start MCP server on stdio
 *   jfp serve --help       # Show Claude Desktop config snippet
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { searchPrompts, buildScorerIndex } from "@jeffreysprompts/core/search";
import { renderPrompt } from "@jeffreysprompts/core/template";
import { loadRegistry } from "../lib/registry-loader";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import chalk from "chalk";

interface ServeOptions {
  config?: boolean;
}

/**
 * Print Claude Desktop configuration snippet
 */
function printConfigSnippet(): void {
  const config = {
    mcpServers: {
      jeffreysprompts: {
        command: "jfp",
        args: ["serve"],
      },
    },
  };

  console.log(chalk.bold.cyan("\nClaude Desktop Configuration\n"));
  console.log(chalk.dim("Add this to your Claude Desktop config:"));
  console.log(chalk.dim("~/.config/claude/claude_desktop_config.json (Linux)"));
  console.log(chalk.dim("~/Library/Application Support/Claude/claude_desktop_config.json (macOS)\n"));
  console.log(JSON.stringify(config, null, 2));
  console.log();
  console.log(chalk.dim("After adding, restart Claude Desktop to load the MCP server."));
  console.log();
}

/**
 * Start the MCP server
 */
export async function serveCommand(options: ServeOptions): Promise<void> {
  if (options.config) {
    printConfigSnippet();
    return;
  }

  // Load registry from cache/remote/bundle (SWR pattern)
  // This ensures we serve the latest prompts including offline/cached updates
  const registry = await loadRegistry();
  const prompts = registry.prompts;
  
  // Build lookup map and search index from loaded prompts
  const promptsMap = new Map(prompts.map((p) => [p.id, p]));
  const searchIndex = buildScorerIndex(prompts);

  function getPrompt(id: string): Prompt | undefined {
    return promptsMap.get(id);
  }

  const server = new Server(
    {
      name: "jeffreysprompts",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List available resources (all prompts)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: prompts.map((prompt) => ({
        uri: `prompt://${prompt.id}`,
        name: prompt.title,
        description: prompt.description,
        mimeType: "text/plain",
      })),
    };
  });

  // Read a specific prompt resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (!uri.startsWith("prompt://")) {
      throw new Error(`Unknown resource URI scheme: ${uri}`);
    }

    const id = uri.replace("prompt://", "");
    const prompt = getPrompt(id);

    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: prompt.content,
        },
      ],
    };
  });

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search_prompts",
          description:
            "Search JeffreysPrompts library by query, category, or tags. Returns matching prompts with relevance scores.",
          inputSchema: {
            type: "object" as const,
            properties: {
              query: {
                type: "string",
                description: "Search query (natural language description of what you need)",
              },
              category: {
                type: "string",
                description: "Filter by category (ideation, documentation, automation, etc.)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags",
              },
              limit: {
                type: "number",
                description: "Maximum results to return (default: 5)",
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: "render_prompt",
          description:
            "Render a prompt with variable substitution and optional context. Returns the fully rendered prompt text.",
          inputSchema: {
            type: "object" as const,
            properties: {
              id: {
                type: "string",
                description: "Prompt ID to render",
              },
              variables: {
                type: "object",
                description: "Variable values to substitute (e.g., {project_name: 'my-app'})",
              },
              context: {
                type: "string",
                description: "Additional context to append to the prompt",
              },
            },
            required: ["id"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search_prompts") {
      const query = String(args?.query ?? "");
      const category =
        args?.category !== undefined && args?.category !== null
          ? String(args.category)
          : undefined;
      const tags = Array.isArray(args?.tags)
        ? args.tags.map((t) => String(t))
        : undefined;
      // Coerce to number and clamp to reasonable range
      const rawLimit = Number(args?.limit);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 5;

      // Get base results (support category/tag filters without a query)
      const trimmedQuery = query.trim();
      let results = trimmedQuery
        ? searchPrompts(trimmedQuery, {
            limit: Math.max(limit * 3, 50),
            scorerIndex: searchIndex,
            promptsMap: promptsMap,
            category,
            tags,
          })
        : prompts.map((prompt) => ({ prompt, score: 0, matchedFields: [] }));

      // If no query, we must filter manually (searchPrompts isn't used)
      if (!trimmedQuery && category) {
        results = results.filter((r) => r.prompt.category === category);
      }
      if (!trimmedQuery && tags && tags.length > 0) {
        results = results.filter((r) =>
          tags.some((tag) => r.prompt?.tags?.includes(tag))
        );
      }

      const totalMatches = results.length;

      // Limit results
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                results: results.map((r) => ({
                  id: r.prompt.id,
                  title: r.prompt.title,
                  description: r.prompt.description,
                  category: r.prompt.category,
                  tags: r.prompt.tags,
                  score: Math.round(r.score * 100) / 100,
                })),
                total: totalMatches,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "render_prompt") {
      const id = args?.id !== undefined && args?.id !== null ? String(args.id) : "";
      // Coerce all variable values to strings to ensure consistent rendering
      const rawVariables = args?.variables;
      const variables: Record<string, string> = {};
      if (typeof rawVariables === 'object' && rawVariables !== null && !Array.isArray(rawVariables)) {
        for (const [key, value] of Object.entries(rawVariables as Record<string, unknown>)) {
          variables[key] = value !== undefined && value !== null ? String(value) : "";
        }
      }
      const context =
        args?.context !== undefined && args?.context !== null
          ? String(args.context)
          : undefined;

      if (!id) {
        return {
          content: [{ type: "text", text: "Error: id is required" }],
          isError: true,
        };
      }

      const prompt = getPrompt(id);
      if (!prompt) {
        return {
          content: [{ type: "text", text: `Error: Prompt not found: ${id}` }],
          isError: true,
        };
      }

      let rendered = renderPrompt(prompt, variables);

      if (context) {
        rendered += "\n\n---\n\n**Context:**\n" + context;
      }

      return {
        content: [{ type: "text", text: rendered }],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  // Connect to stdio transport and run
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
