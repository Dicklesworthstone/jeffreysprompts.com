//! Random command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 10 (random):
//! - Options: --category, --tag, --copy, --json
//! - Filter by category/tag; if none, error no_prompts
//! - Copy uses platform clipboard tools
//! - Non-JSON output shows preview (first 10 lines) and metadata

use std::process::ExitCode;

use rand::prelude::IndexedRandom;
use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::Prompt;

#[derive(Serialize)]
struct RandomOutput {
    id: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    copied: Option<bool>,
}

impl From<&Prompt> for RandomOutput {
    fn from(p: &Prompt) -> Self {
        Self {
            id: p.id.clone(),
            title: p.title.clone(),
            description: p.description.clone(),
            category: p.category.clone(),
            tags: p.tags.clone(),
            content: p.content.clone(),
            copied: None,
        }
    }
}

pub fn run(
    category: Option<String>,
    tag: Option<String>,
    copy: bool,
    use_json: bool,
) -> ExitCode {
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

    // Get filtered prompts
    let prompts = match db.list_prompts_filtered(
        category.as_deref(),
        tag.as_deref(),
        false,
    ) {
        Ok(p) => p,
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error listing prompts: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    // Check if any prompts match
    if prompts.is_empty() {
        if use_json {
            println!(r#"{{"error": "no_prompts"}}"#);
        } else {
            eprintln!("No prompts found matching the filters.");
        }
        return ExitCode::FAILURE;
    }

    // Select random prompt
    let mut rng = rand::rng();
    let Some(prompt) = prompts.choose(&mut rng) else {
        if use_json {
            println!(r#"{{"error": "no_prompts"}}"#);
        } else {
            eprintln!("No prompts found matching the filters.");
        }
        return ExitCode::FAILURE;
    };

    // Copy to clipboard if requested
    let copied = if copy {
        match copy_to_clipboard(&prompt.content) {
            Ok(()) => Some(true),
            Err(e) => {
                if !use_json {
                    eprintln!("Warning: Failed to copy to clipboard: {}", e);
                }
                Some(false)
            }
        }
    } else {
        None
    };

    if use_json {
        let mut output = RandomOutput::from(prompt);
        output.copied = copied;
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        // Human-readable output with preview
        println!("# {} - {}", prompt.id, prompt.title);
        println!();

        if let Some(desc) = &prompt.description {
            println!("{}", desc);
            println!();
        }

        if let Some(cat) = &prompt.category {
            print!("Category: {}  ", cat);
        }
        if !prompt.tags.is_empty() {
            print!("Tags: {}", prompt.tags.join(", "));
        }
        println!("\n");

        // Preview (first 10 lines)
        println!("--- Preview ---");
        for (i, line) in prompt.content.lines().take(10).enumerate() {
            println!("{}", line);
            if i == 9 && prompt.content.lines().count() > 10 {
                println!("...");
            }
        }
        println!("---------------");

        if copied == Some(true) {
            println!("\n✓ Copied to clipboard!");
        }

        println!("\nUse 'jfp show {}' to see full content", prompt.id);
    }

    ExitCode::SUCCESS
}

/// Copy text to clipboard using platform tools
fn copy_to_clipboard(text: &str) -> Result<(), String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

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
