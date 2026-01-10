"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { categories } from "@jeffreysprompts/core/prompts/registry";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";
import { Github, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SAFE_ID_PATTERN = /^[a-z0-9-]+$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function formatArray(items: string[], indent: string = "  "): string {
  if (items.length === 0) {
    return "[]";
  }
  if (items.length === 1) {
    return `[${quote(items[0])}]`;
  }
  const innerIndent = `${indent}  `;
  return `[` +
    `\n${items.map((item) => `${innerIndent}${quote(item)}`).join(",\n")}` +
    `\n${indent}]`;
}

function escapeTemplateLiteral(value: string): string {
  return value.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export default function ContributePage() {
  const [title, setTitle] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PromptCategory | "">("");
  const [tagsInput, setTagsInput] = useState("");
  const [author, setAuthor] = useState("Community");
  const [twitter, setTwitter] = useState("");
  const [content, setContent] = useState("");
  const [whenToUseInput, setWhenToUseInput] = useState("");
  const [tipsInput, setTipsInput] = useState("");

  useEffect(() => {
    if (!idTouched) {
      setId(slugify(title));
    }
  }, [title, idTouched]);

  const createdDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const tags = useMemo(() => parseCommaList(tagsInput), [tagsInput]);
  const whenToUse = useMemo(() => parseLineList(whenToUseInput), [whenToUseInput]);
  const tips = useMemo(() => parseLineList(tipsInput), [tipsInput]);

  const effectiveId = id || slugify(title) || "your-prompt-id";
  const effectiveCategory = (category || "ideation") as PromptCategory;
  const safeContent = content.trim()
    ? escapeTemplateLiteral(content.trim())
    : "Write your prompt content here.";

  const tsEntry = useMemo(() => {
    const lines: string[] = [
      "{",
      `  id: ${quote(effectiveId)},`,
      `  title: ${quote(title || "Your Prompt Title")},`,
      `  description: ${quote(description || "One-line description of the prompt")},`,
      `  category: ${quote(effectiveCategory)},`,
      `  tags: ${formatArray(tags.length ? tags : ["tag-one", "tag-two"])},`,
      `  author: ${quote(author || "Community")},`,
    ];

    if (twitter.trim()) {
      lines.push(`  twitter: ${quote(twitter.trim())},`);
    }

    lines.push(
      `  version: ${quote("1.0.0")},`,
      `  created: ${quote(createdDate)},`,
      `  content: \`${safeContent}\`,`,
      `  whenToUse: ${formatArray(whenToUse.length ? whenToUse : ["When you need X", "When you need Y"])},`,
      `  tips: ${formatArray(tips.length ? tips : ["Tip 1", "Tip 2"])},`,
      "}"
    );

    return lines.join("\n");
  }, [author, createdDate, description, effectiveCategory, effectiveId, safeContent, tags, title, twitter, whenToUse, tips]);

  const issueTitle = title
    ? `Prompt submission: ${title}`
    : "Prompt submission";

  const issueBody = useMemo(() => {
    return [
      "## Prompt Submission",
      "",
      "Paste the prompt entry below into the registry:",
      "",
      "```ts",
      tsEntry,
      "```",
      "",
      "## Notes",
      "- Why this prompt is useful:",
      "- Example usage:",
      "- Any attribution or links:",
    ].join("\n");
  }, [tsEntry]);

  const issueUrl = useMemo(() => {
    const params = new URLSearchParams({
      title: issueTitle,
      body: issueBody,
    });
    return `https://github.com/Dicklesworthstone/jeffreysprompts.com/issues/new?${params.toString()}`;
  }, [issueBody, issueTitle]);

  const prUrl = useMemo(() => {
    const params = new URLSearchParams({
      title: issueTitle,
      body: issueBody,
    });
    return `https://github.com/Dicklesworthstone/jeffreysprompts.com/compare?expand=1&${params.toString()}`;
  }, [issueBody, issueTitle]);

  const idIsValid = SAFE_ID_PATTERN.test(effectiveId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="border-b border-border/60">
        <div className="container-wide py-12">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/30 px-3 py-1 rounded-full w-fit">
              <Sparkles className="h-4 w-4" />
              Contribute a prompt
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
              Share your favorite prompt
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Use this page to format a prompt submission for JeffreysPrompts.com. No database, no
              account, just a clean GitHub issue or pull request with a ready-to-paste TypeScript
              entry.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-2">
                <Github className="h-4 w-4" />
                Submissions go to GitHub
              </span>
              <span>•</span>
              <Link
                href="/"
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Browse prompts
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Prompt details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prompt-title">Title</Label>
                  <Input
                    id="prompt-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="The Idea Wizard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-id">Prompt ID (kebab-case)</Label>
                  <Input
                    id="prompt-id"
                    value={id}
                    onChange={(event) => {
                      setIdTouched(true);
                      setId(event.target.value.toLowerCase());
                    }}
                    placeholder="idea-wizard"
                  />
                  {!idIsValid && (
                    <p className="text-xs text-rose-600">
                      IDs should only use lowercase letters, numbers, and hyphens.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-description">Description</Label>
                <Textarea
                  id="prompt-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Generate and evaluate improvement ideas for any project"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prompt-category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as PromptCategory)}
                  >
                    <SelectTrigger id="prompt-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-tags">Tags (comma separated)</Label>
                  <Input
                    id="prompt-tags"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="brainstorming, improvement, ultrathink"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prompt-author">Author</Label>
                  <Input
                    id="prompt-author"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-twitter">Twitter (optional)</Label>
                  <Input
                    id="prompt-twitter"
                    value={twitter}
                    onChange={(event) => setTwitter(event.target.value)}
                    placeholder="@handle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-content">Prompt content</Label>
                <Textarea
                  id="prompt-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write the full prompt text here. Variables like {{PROJECT_NAME}} are allowed."
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-when">When to use (one per line)</Label>
                <Textarea
                  id="prompt-when"
                  value={whenToUseInput}
                  onChange={(event) => setWhenToUseInput(event.target.value)}
                  placeholder="When starting a new feature\nWhen reviewing a codebase"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-tips">Tips (one per line)</Label>
                <Textarea
                  id="prompt-tips"
                  value={tipsInput}
                  onChange={(event) => setTipsInput(event.target.value)}
                  placeholder="Run this at the start of a session\nFocus on the top 3 ideas"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>TypeScript preview</CardTitle>
                  <CopyButton
                    text={tsEntry}
                    variant="inline"
                    label="Copy entry"
                    showPreview={false}
                    successMessage="TypeScript entry copied"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{effectiveCategory}</Badge>
                  {tags.length > 0 && tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {!idIsValid && (
                    <Badge variant="destructive" className="text-xs">
                      Invalid ID
                    </Badge>
                  )}
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-xs font-mono text-zinc-700 dark:text-zinc-200">
                  {tsEntry}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Submit your prompt</CardTitle>
                  <CopyButton
                    text={issueBody}
                    variant="inline"
                    label="Copy issue body"
                    showPreview={false}
                    successMessage="Issue body copied"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the path you prefer. GitHub issues are fastest; PRs are great if you want to
                  add the prompt yourself.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="justify-between">
                    <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                      Open GitHub issue
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="justify-between">
                    <a href={prUrl} target="_blank" rel="noopener noreferrer">
                      Open pull request draft
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contribution checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Keep prompts concrete, actionable, and tested in real work.</li>
                  <li>Use kebab-case IDs that will not need to change later.</li>
                  <li>Include 2-4 solid when-to-use items and tips.</li>
                  <li>Attribute authorship clearly.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
