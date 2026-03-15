//! Open command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 18 (open):
//! - Opens prompt in browser at jeffreysprompts.com/prompts/{id}
//! - Uses platform-specific browser opener

use std::process::{Command, ExitCode};

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;

#[derive(Serialize)]
struct OpenOutput {
    url: String,
    opened: bool,
}

pub fn run(id: &str, use_json: bool) -> ExitCode {
    // Open database and verify prompt exists
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

    // Check if prompt exists
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

    // Build URL
    let url = format!("https://jeffreysprompts.com/prompts/{}", prompt.id);

    // Open in browser
    let opened = match open_url(&url) {
        Ok(()) => true,
        Err(e) => {
            if !use_json {
                eprintln!("Warning: Failed to open browser: {}", e);
                eprintln!("URL: {}", url);
            }
            false
        }
    };

    if use_json {
        let output = OpenOutput {
            url: url.clone(),
            opened,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if opened {
            println!("Opened {} in browser", url);
        } else {
            println!("URL: {}", url);
        }
    }

    ExitCode::SUCCESS
}

/// Open URL in default browser using platform-specific command
fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(url).status();

    #[cfg(target_os = "linux")]
    let result = Command::new("xdg-open").arg(url).status();

    #[cfg(target_os = "windows")]
    let result = Command::new("cmd").args(["/C", "start", "", url]).status();

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return Err("Browser opening not supported on this platform".to_string());

    match result {
        Ok(status) if status.success() => Ok(()),
        Ok(status) => Err(format!("Browser command exited with status: {}", status)),
        Err(e) => Err(format!("Failed to run browser command: {}", e)),
    }
}
