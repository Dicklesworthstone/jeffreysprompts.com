//! Refresh command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 14 (refresh):
//! - Refreshes local registry cache from remote
//! - Falls back to bundled prompts if network fails

use std::process::ExitCode;

use chrono::Utc;
use serde::Serialize;

use crate::registry::{bundled_prompts, RegistryLoader};
use crate::storage::Database;
use crate::types::RegistrySource;

#[derive(Serialize)]
struct RefreshOutput {
    refreshed: bool,
    prompt_count: usize,
    source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

pub fn run(use_json: bool) -> ExitCode {
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

    let loader = RegistryLoader::new();
    let refresh = loader.refresh();

    let (prompts, source, message) = match refresh {
        Ok(result) => {
            let source = match result.source {
                RegistrySource::Remote => "remote",
                RegistrySource::Cache => "cache",
                RegistrySource::Bundled => "bundled",
                RegistrySource::Local => "local",
            };
            let message = (result.source == RegistrySource::Cache && result.stale)
                .then_some("Remote refresh failed; using cached registry".to_string());
            (result.registry.prompts, source.to_string(), message)
        }
        Err(e) => (
            bundled_prompts(),
            "bundled".to_string(),
            Some(format!(
                "Remote refresh failed; loaded bundled prompts instead ({})",
                e
            )),
        ),
    };

    let mut loaded_count = 0;

    for prompt in &prompts {
        if db.upsert_prompt(prompt).is_ok() {
            loaded_count += 1;
        }
    }

    // Update sync timestamp
    let _ = db.set_meta("last_sync", &Utc::now().to_rfc3339());

    let prompt_count = db.prompt_count().unwrap_or(loaded_count);

    if use_json {
        let output = RefreshOutput {
            refreshed: true,
            prompt_count,
            source,
            message,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("Refreshed registry with {} prompts", prompt_count);
        println!("Source: {}", source);
        if let Some(message) = message {
            println!("{}", message);
        }
    }

    ExitCode::SUCCESS
}
