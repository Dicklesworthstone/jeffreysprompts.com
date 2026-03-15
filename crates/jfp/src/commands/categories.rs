//! Categories command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 10:
//! - categories: counts prompts per category, sorted by name

use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;

#[derive(Serialize)]
struct CategoryOutput {
    name: String,
    count: usize,
}

#[derive(Serialize)]
struct CategoriesOutput {
    categories: Vec<CategoryOutput>,
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

    // Get category counts
    let categories = match db.category_counts() {
        Ok(c) => c,
        Err(e) => {
            if use_json {
                println!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
            } else {
                eprintln!("Error getting categories: {}", e);
            }
            return ExitCode::FAILURE;
        }
    };

    let total = categories.len();

    if use_json {
        let output = CategoriesOutput {
            categories: categories
                .into_iter()
                .map(|(name, count)| CategoryOutput { name, count })
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
        if categories.is_empty() {
            println!("No categories found.");
        } else {
            println!("Categories ({}):\n", total);
            for (name, count) in &categories {
                println!("  {} ({})", name, count);
            }
        }
    }

    ExitCode::SUCCESS
}
