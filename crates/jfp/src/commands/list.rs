//! List command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 10 (list):
//! - Options: --category, --tag, --mine, --saved, --json
//! - JSON output: { prompts, count, offline?, offlineAge? }

use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::PromptSummary;

/// JSON output for list command
#[derive(Serialize)]
struct ListOutput {
    prompts: Vec<PromptSummary>,
    count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<String>,
}

pub fn run(
    category: Option<String>,
    tag: Option<String>,
    featured: bool,
    use_json: bool,
) -> ExitCode {
    // Try to open database
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

    // Check if database has prompts, if not, seed with bundled
    let count = db.prompt_count().unwrap_or(0);
    if count == 0 {
        let prompts = bundled_prompts();
        for prompt in &prompts {
            if let Err(e) = db.upsert_prompt(prompt) {
                eprintln!("Warning: Failed to seed prompt {}: {}", prompt.id, e);
            }
        }
    }

    // List prompts with filters
    let prompts = match db.list_prompts_filtered(
        category.as_deref(),
        tag.as_deref(),
        featured,
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

    let count = prompts.len();

    if use_json {
        let output = ListOutput {
            prompts: prompts.iter().map(PromptSummary::from).collect(),
            count,
            source: Some("local".to_string()),
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if prompts.is_empty() {
            println!("No prompts found.");
            if category.is_some() || tag.is_some() || featured {
                println!("Try different filters or run without filters.");
            }
        } else {
            println!("Prompts ({}):\n", count);
            for prompt in &prompts {
                // Print prompt summary
                print!("  {} - {}", prompt.id, prompt.title);
                if prompt.featured {
                    print!(" [featured]");
                }
                println!();

                if let Some(desc) = &prompt.description {
                    let truncated = if desc.len() > 60 {
                        format!("{}...", &desc[..57])
                    } else {
                        desc.clone()
                    };
                    println!("    {}", truncated);
                }

                if let Some(cat) = &prompt.category {
                    print!("    Category: {}", cat);
                }
                if !prompt.tags.is_empty() {
                    print!("  Tags: {}", prompt.tags.join(", "));
                }
                println!("\n");
            }
        }
    }

    ExitCode::SUCCESS
}
