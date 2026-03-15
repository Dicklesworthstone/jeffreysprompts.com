//! Tags command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 10:
//! - tags: counts per tag, sorted by count desc

use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;

#[derive(Serialize)]
struct TagOutput {
    name: String,
    count: usize,
}

#[derive(Serialize)]
struct TagsOutput {
    tags: Vec<TagOutput>,
    total: usize,
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

    // Seed if empty
    let count = db.prompt_count().unwrap_or(0);
    if count == 0 {
        let prompts = bundled_prompts();
        for prompt in &prompts {
            let _ = db.upsert_prompt(prompt);
        }
    }

    // Get tag counts
    let tags = match db.tag_counts() {
        Ok(t) => t,
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error getting tags: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    let total = tags.len();

    if use_json {
        let output = TagsOutput {
            tags: tags
                .into_iter()
                .map(|(name, count)| TagOutput { name, count })
                .collect(),
            total,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if tags.is_empty() {
            println!("No tags found.");
        } else {
            println!("Tags ({}):\n", total);
            for (name, count) in &tags {
                println!("  {} ({})", name, count);
            }
        }
    }

    ExitCode::SUCCESS
}
