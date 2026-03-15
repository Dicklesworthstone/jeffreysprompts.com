//! Copy command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 8 (copy):
//! - Copies prompt content to clipboard
//! - Optional --fill for interactive variable substitution
//! - Uses platform clipboard tools

use std::io::{self, Write};
use std::process::{Command, ExitCode, Stdio};

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::Prompt;

#[derive(Serialize)]
struct CopyOutput {
    id: String,
    title: String,
    copied: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    filled_variables: Option<Vec<FilledVariable>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content_length: Option<usize>,
}

#[derive(Serialize)]
struct FilledVariable {
    name: String,
    value: String,
}

pub fn run(id: &str, fill: bool, use_json: bool) -> ExitCode {
    // Open database
    let db = match Database::open() {
        Ok(db) => db,
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error opening database: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    // Seed if empty
    let count = db.prompt_count().unwrap_or(0);
    if count == 0 {
        let prompts = bundled_prompts();
        for prompt in &prompts {
            let _ = db.upsert_prompt(prompt);
        }
    }

    // Get prompt
    let prompt = match db.get_prompt(id) {
        Ok(Some(p)) => p,
        Ok(None) => {
            if use_json {
                println!(r#"{{"error": "not_found", "id": "{}"}}"#, id);
            } else {
                eprintln!("Prompt '{}' not found.", id);
            }
            return ExitCode::FAILURE;
        }
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error getting prompt: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    // Process content (with variable filling if requested)
    let (content, filled_variables) = if fill && !prompt.variables.is_empty() {
        fill_variables(&prompt, use_json)
    } else {
        (prompt.content.clone(), None)
    };

    // Copy to clipboard
    let copied = match copy_to_clipboard(&content) {
        Ok(()) => true,
        Err(e) => {
            if !use_json {
                eprintln!("Warning: Failed to copy to clipboard: {}", e);
            }
            false
        }
    };

    if use_json {
        let output = CopyOutput {
            id: prompt.id.clone(),
            title: prompt.title.clone(),
            copied,
            filled_variables,
            content_length: Some(content.len()),
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if copied {
            println!("Copied '{}' to clipboard!", prompt.title);
            if let Some(vars) = filled_variables {
                println!("\nFilled variables:");
                for v in vars {
                    println!("  {} = {}", v.name, v.value);
                }
            }
        } else {
            println!("Content ({} characters):", content.len());
            println!("{}", content);
        }
    }

    ExitCode::SUCCESS
}

/// Fill variables interactively by prompting the user
fn fill_variables(prompt: &Prompt, use_json: bool) -> (String, Option<Vec<FilledVariable>>) {
    let mut content = prompt.content.clone();
    let mut filled = Vec::new();

    // In JSON mode or non-TTY, don't prompt - just return original
    if use_json || !atty::is(atty::Stream::Stdin) {
        return (content, None);
    }

    for var in &prompt.variables {
        let default_hint = var.default.as_ref()
            .map(|d| format!(" [{}]", d))
            .unwrap_or_default();

        let description = var.description.as_ref()
            .map(|d| format!(" ({})", d))
            .unwrap_or_default();

        print!("{}{}{}: ", var.name, description, default_hint);
        io::stdout().flush().ok();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_ok() {
            let value = input.trim();
            let value = if value.is_empty() {
                var.default.clone().unwrap_or_default()
            } else {
                value.to_string()
            };

            // Replace the variable placeholder in content
            let placeholder = format!("{{{{{}}}}}", var.name);
            content = content.replace(&placeholder, &value);

            filled.push(FilledVariable {
                name: var.name.clone(),
                value,
            });
        }
    }

    (content, Some(filled))
}

/// Copy text to clipboard using platform tools
fn copy_to_clipboard(text: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut cmd = Command::new("pbcopy");

    #[cfg(target_os = "linux")]
    let mut cmd = {
        // Try xclip first, fall back to xsel
        if Command::new("which").arg("xclip").output().map(|o| o.status.success()).unwrap_or(false) {
            let mut c = Command::new("xclip");
            c.arg("-selection").arg("clipboard");
            c
        } else {
            let mut c = Command::new("xsel");
            c.arg("--clipboard").arg("--input");
            c
        }
    };

    #[cfg(target_os = "windows")]
    let mut cmd = Command::new("clip");

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return Err("Clipboard not supported on this platform".to_string());

    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn clipboard command: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
    }

    let status = child.wait().map_err(|e| format!("Clipboard command failed: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("Clipboard command returned non-zero exit code".to_string())
    }
}
