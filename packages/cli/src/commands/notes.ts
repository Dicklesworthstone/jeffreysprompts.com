/**
 * Notes Command
 *
 * Manage personal notes on prompts.
 * - jfp notes <prompt-id> - Show notes for a prompt
 * - jfp notes <prompt-id> --add 'text' - Add a note
 * - jfp notes <prompt-id> --delete <note-id> - Delete a note
 *
 * Notes are private to the authenticated user.
 */

import chalk from "chalk";
import boxen from "boxen";
import { apiClient, isAuthError, requiresPremium } from "../lib/api-client";
import { getAccessToken } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

export interface NotesOptions {
  add?: string;
  delete?: string;
  json?: boolean;
}

interface Note {
  id: string;
  prompt_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotesResponse {
  notes: Note[];
  prompt_id: string;
}

interface NoteActionResponse {
  success: boolean;
  note?: Note;
  message?: string;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Notes command - view, add, or delete notes on prompts
 */
export async function notesCommand(promptId: string, options: NotesOptions = {}): Promise<void> {
  // Check if prompt exists in registry (including offline/synced)
  const registry = await loadRegistry();
  const prompt = registry.prompts.find((p) => p.id === promptId);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_found", `Prompt not found: ${promptId}`);
    } else {
      console.error(chalk.red(`Prompt not found: ${promptId}`));
    }
    process.exit(1);
  }

  // Check authentication
  const token = await getAccessToken();
  if (!token) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to manage notes");
    } else {
      console.log(chalk.yellow("You must be logged in to manage notes"));
      console.log(chalk.dim("Run 'jfp login' to sign in"));
    }
    process.exit(1);
  }

  // Handle delete
  if (options.delete) {
    return deleteNote(promptId, options.delete, options);
  }

  // Handle add
  if (options.add) {
    return addNote(promptId, options.add, options);
  }

  // Default: list notes
  return listNotes(promptId, options);
}

/**
 * List notes for a prompt
 */
async function listNotes(promptId: string, options: NotesOptions): Promise<void> {
  const response = await apiClient.get<NotesResponse>(`/cli/notes/${promptId}`);

  if (!response.ok) {
    handleApiError(response, options);
    return;
  }

  const { notes } = response.data!;

  if (shouldOutputJson(options)) {
    writeJson({
      prompt_id: promptId,
      notes,
      count: notes.length,
    });
    return;
  }

  // Human-readable output
  if (notes.length === 0) {
    console.log(chalk.dim(`No notes for prompt: ${promptId}`));
    console.log(chalk.dim("\nAdd a note with: jfp notes " + promptId + " --add 'Your note here'"));
    return;
  }

  console.log(chalk.bold(`Notes for ${promptId}`) + chalk.dim(` (${notes.length})`));
  console.log();

  for (const note of notes) {
    const createdDate = new Date(note.created_at).toLocaleDateString();
    console.log(chalk.cyan(`[${note.id}]`) + " " + chalk.dim(createdDate));
    console.log("  " + note.content);
    console.log();
  }

  console.log(chalk.dim("Delete a note with: jfp notes " + promptId + " --delete <note-id>"));
}

/**
 * Add a note to a prompt
 */
async function addNote(promptId: string, content: string, options: NotesOptions): Promise<void> {
  if (!content.trim()) {
    if (shouldOutputJson(options)) {
      writeJsonError("empty_note", "Note content cannot be empty");
    } else {
      console.log(chalk.red("Note content cannot be empty"));
    }
    process.exit(1);
  }

  const response = await apiClient.post<NoteActionResponse>(`/cli/notes/${promptId}`, {
    content: content.trim(),
  });

  if (!response.ok) {
    handleApiError(response, options);
    return;
  }

  const { note } = response.data!;

  if (shouldOutputJson(options)) {
    writeJson({
      added: true,
      prompt_id: promptId,
      note,
    });
    return;
  }

  console.log(chalk.green("✓") + " Note added to " + chalk.bold(promptId));
  console.log(chalk.dim("  ID: " + note?.id));
  console.log(chalk.dim("  Content: " + content.trim().substring(0, 50) + (content.length > 50 ? "..." : "")));
}

/**
 * Delete a note
 */
async function deleteNote(promptId: string, noteId: string, options: NotesOptions): Promise<void> {
  const response = await apiClient.delete<NoteActionResponse>(`/cli/notes/${promptId}/${noteId}`);

  if (!response.ok) {
    handleApiError(response, options);
    return;
  }

  if (shouldOutputJson(options)) {
    writeJson({
      deleted: true,
      prompt_id: promptId,
      note_id: noteId,
    });
    return;
  }

  console.log(chalk.green("✓") + " Note deleted: " + chalk.dim(noteId));
}

/**
 * Handle API errors with appropriate messaging
 */
function handleApiError(response: { ok: boolean; status: number; error?: string }, options: NotesOptions): void {
  if (isAuthError(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("authentication_required", "Session expired. Please run 'jfp login' to sign in again.");
    } else {
      console.log(chalk.yellow("Session expired. Please run 'jfp login' to sign in again."));
    }
    process.exit(1);
  }

  if (requiresPremium(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Notes require a Premium subscription");
    } else {
      console.log(chalk.yellow("Notes require a Premium subscription"));
      console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com"));
    }
    process.exit(1);
  }

  // Generic error
  if (shouldOutputJson(options)) {
    writeJsonError("api_error", response.error || "An error occurred", {
      status: response.status,
    });
  } else {
    console.log(chalk.red("Error: " + (response.error || "An error occurred")));
  }
  process.exit(1);
}
