//! Search command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 10 (search):
//! - Uses BM25 index from core (buildIndex, searchPrompts)
//! - JSON output: { results, query, authenticated, offline?, warning? }

use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::PromptSummary;

/// Search result for JSON output
#[derive(Serialize)]
struct SearchResultOutput {
    #[serde(flatten)]
    prompt: PromptSummary,
    score: f64,
}

/// JSON output for search command
#[derive(Serialize)]
struct SearchOutput {
    results: Vec<SearchResultOutput>,
    query: String,
    count: usize,
    authenticated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    offline: Option<bool>,
}

pub fn run(query: &str, limit: usize, use_json: bool) -> ExitCode {
    // Validate limit
    if limit == 0 || limit > 100 {
        if use_json {
            println!(r#"{{"error": "invalid_limit", "message": "Limit must be between 1 and 100"}}"#);
        } else {
            eprintln!("Error: Limit must be between 1 and 100");
        }
        return ExitCode::FAILURE;
    }

    // Validate query
    if query.trim().is_empty() {
        if use_json {
            println!(r#"{{"error": "empty_query", "message": "Search query cannot be empty"}}"#);
        } else {
            eprintln!("Error: Search query cannot be empty");
        }
        return ExitCode::FAILURE;
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

    // Search using FTS5
    let results = match db.search(query, limit) {
        Ok(r) => r,
        Err(e) => {
            // FTS5 query syntax error - try escaping special chars
            let escaped_query = escape_fts_query(query);
            match db.search(&escaped_query, limit) {
                Ok(r) => r,
                Err(_) => {
                    if use_json {
                        println!(r#"{{"error": "search_error", "message": "{}"}}"#, e);
                    } else {
                        eprintln!("Search error: {}", e);
                    }
                    return ExitCode::FAILURE;
                }
            }
        }
    };

    let result_count = results.len();

    if use_json {
        let output = SearchOutput {
            results: results
                .iter()
                .map(|(prompt, score)| SearchResultOutput {
                    prompt: PromptSummary::from(prompt),
                    score: *score,
                })
                .collect(),
            query: query.to_string(),
            count: result_count,
            authenticated: false,
            offline: None,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        if results.is_empty() {
            println!("No results found for \"{}\"", query);
        } else {
            println!("Search results for \"{}\" ({} found):\n", query, result_count);
            for (prompt, score) in &results {
                println!("  {} - {} (score: {:.2})", prompt.id, prompt.title, score);
                if let Some(desc) = &prompt.description {
                    let truncated = if desc.len() > 60 {
                        format!("{}...", &desc[..57])
                    } else {
                        desc.clone()
                    };
                    println!("    {}", truncated);
                }
                println!();
            }
        }
    }

    ExitCode::SUCCESS
}

/// Escape special FTS5 characters in query
fn escape_fts_query(query: &str) -> String {
    // FTS5 special characters: * - + " ( ) { } [ ] ^ ~ : \
    // For simple queries, we can just wrap in quotes
    format!("\"{}\"", query.replace('"', "\"\""))
}
