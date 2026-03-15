//! Suggest command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 12 (suggest):
//! - Suggests prompts for a task description
//! - Uses FTS5 search as a simple relevance mechanism
//! - Semantic search option (not yet implemented)

use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;

#[derive(Serialize)]
struct SuggestOutput {
    task: String,
    suggestions: Vec<Suggestion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    semantic: Option<bool>,
}

#[derive(Serialize)]
struct Suggestion {
    id: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    relevance: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,
}

pub fn run(task: &str, limit: usize, semantic: bool, use_json: bool) -> ExitCode {
    if semantic {
        if use_json {
            println!(r#"{{"error": "semantic_not_implemented", "message": "Semantic search not yet available"}}"#);
        } else {
            eprintln!("Semantic search not yet implemented. Using keyword search.");
        }
        // Continue with keyword search
    }

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

    // Search for relevant prompts using FTS5
    let results = match db.search(task, limit) {
        Ok(r) => r,
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "search_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error searching: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    let suggestions: Vec<Suggestion> = results
        .into_iter()
        .map(|(prompt, score)| {
            // Generate a simple reason based on matching
            let reason = generate_reason(&prompt.title, &prompt.description, &prompt.tags, task);

            Suggestion {
                id: prompt.id,
                title: prompt.title,
                description: prompt.description,
                relevance: score,
                reason: Some(reason),
            }
        })
        .collect();

    if use_json {
        let output = SuggestOutput {
            task: task.to_string(),
            suggestions,
            semantic: if semantic { Some(false) } else { None },
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if suggestions.is_empty() {
            println!("No suggestions found for: {}", task);
            println!("\nTry different keywords or use 'jfp list' to browse all prompts.");
        } else {
            println!("Suggestions for: {}\n", task);

            for (i, s) in suggestions.iter().enumerate() {
                println!("{}. {} ({})", i + 1, s.title, s.id);
                if let Some(desc) = &s.description {
                    println!("   {}", desc);
                }
                if let Some(reason) = &s.reason {
                    println!("   Why: {}", reason);
                }
                println!();
            }

            println!("Use 'jfp show <id>' to see full details");
            println!("Use 'jfp copy <id>' to copy to clipboard");
        }
    }

    ExitCode::SUCCESS
}

/// Generate a simple reason for why a prompt was suggested
fn generate_reason(
    title: &str,
    description: &Option<String>,
    tags: &[String],
    task: &str,
) -> String {
    let task_lower = task.to_lowercase();
    let task_words: Vec<&str> = task_lower.split_whitespace().collect();

    let mut matches = Vec::new();

    // Check title
    let title_lower = title.to_lowercase();
    for word in &task_words {
        if title_lower.contains(word) && word.len() > 2 {
            matches.push(format!("title contains '{}'", word));
            break;
        }
    }

    // Check description
    if let Some(desc) = description {
        let desc_lower = desc.to_lowercase();
        for word in &task_words {
            if desc_lower.contains(word) && word.len() > 2 {
                matches.push(format!("description mentions '{}'", word));
                break;
            }
        }
    }

    // Check tags
    for tag in tags {
        let tag_lower = tag.to_lowercase();
        for word in &task_words {
            if tag_lower.contains(word) || word.contains(&tag_lower) {
                matches.push(format!("tagged as '{}'", tag));
                break;
            }
        }
    }

    if matches.is_empty() {
        "Related to your task keywords".to_string()
    } else {
        matches.join("; ")
    }
}
