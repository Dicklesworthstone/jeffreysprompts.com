//! Render command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 9 (render):
//! - Renders prompt with variable substitution
//! - Optional --fill for interactive substitution
//! - Optional --context for file-based context

use std::collections::HashMap;
use std::fs;
use std::io::{self, Write};
use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::Prompt;

#[derive(Serialize)]
struct RenderOutput {
    id: String,
    title: String,
    rendered: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    filled_variables: Option<Vec<FilledVariable>>,
}

#[derive(Serialize)]
struct FilledVariable {
    name: String,
    value: String,
}

pub fn run(
    id: &str,
    fill: bool,
    context: Option<String>,
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

    // Load context file if provided
    let context_values: HashMap<String, String> = if let Some(path) = &context {
        match load_context_file(path) {
            Ok(ctx) => ctx,
            Err(e) => {
                if use_json {
                    println!(r#"{{"error": "context_error", "message": "{}"}}"#, e);
                } else {
                    eprintln!("Error loading context: {}", e);
                }
                return ExitCode::FAILURE;
            }
        }
    } else {
        HashMap::new()
    };

    // Process content
    let (rendered, filled_variables) = if fill && !prompt.variables.is_empty() {
        fill_variables(&prompt, &context_values, use_json)
    } else if !context_values.is_empty() {
        // Just apply context values without interactive fill
        let mut content = prompt.content.clone();
        let mut filled = Vec::new();

        for (name, value) in &context_values {
            let placeholder = format!("{{{{{}}}}}", name);
            if content.contains(&placeholder) {
                content = content.replace(&placeholder, value);
                filled.push(FilledVariable {
                    name: name.clone(),
                    value: value.clone(),
                });
            }
        }

        (content, if filled.is_empty() { None } else { Some(filled) })
    } else {
        (prompt.content.clone(), None)
    };

    if use_json {
        let output = RenderOutput {
            id: prompt.id.clone(),
            title: prompt.title.clone(),
            rendered,
            filled_variables,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("{}", rendered);
    }

    ExitCode::SUCCESS
}

/// Load context from a JSON or TOML file
fn load_context_file(path: &str) -> Result<HashMap<String, String>, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read context file: {}", e))?;

    // Try JSON first
    if path.ends_with(".json") {
        let map: HashMap<String, serde_json::Value> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        return Ok(map.into_iter()
            .map(|(k, v)| (k, value_to_string(&v)))
            .collect());
    }

    // Try TOML
    if path.ends_with(".toml") {
        let map: HashMap<String, toml::Value> = toml::from_str(&content)
            .map_err(|e| format!("Failed to parse TOML: {}", e))?;
        return Ok(map.into_iter()
            .map(|(k, v)| (k, toml_value_to_string(&v)))
            .collect());
    }

    // Default: try JSON
    match serde_json::from_str::<HashMap<String, serde_json::Value>>(&content) {
        Ok(map) => Ok(map.into_iter()
            .map(|(k, v)| (k, value_to_string(&v)))
            .collect()),
        Err(_) => {
            // Try TOML
            let map: HashMap<String, toml::Value> = toml::from_str(&content)
                .map_err(|e| format!("Failed to parse context file: {}", e))?;
            Ok(map.into_iter()
                .map(|(k, v)| (k, toml_value_to_string(&v)))
                .collect())
        }
    }
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        _ => v.to_string(),
    }
}

fn toml_value_to_string(v: &toml::Value) -> String {
    match v {
        toml::Value::String(s) => s.clone(),
        _ => v.to_string(),
    }
}

/// Fill variables interactively, using context as defaults
fn fill_variables(
    prompt: &Prompt,
    context: &HashMap<String, String>,
    use_json: bool,
) -> (String, Option<Vec<FilledVariable>>) {
    let mut content = prompt.content.clone();
    let mut filled = Vec::new();

    // In JSON mode or non-TTY, use context values only
    if use_json || !atty::is(atty::Stream::Stdin) {
        for var in &prompt.variables {
            let value = context.get(&var.name)
                .or(var.default.as_ref())
                .cloned()
                .unwrap_or_default();

            let placeholder = format!("{{{{{}}}}}", var.name);
            content = content.replace(&placeholder, &value);

            if !value.is_empty() {
                filled.push(FilledVariable {
                    name: var.name.clone(),
                    value,
                });
            }
        }
        return (content, Some(filled));
    }

    for var in &prompt.variables {
        let context_default = context.get(&var.name);
        let default = context_default.or(var.default.as_ref());

        let default_hint = default
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
                default.cloned().unwrap_or_default()
            } else {
                value.to_string()
            };

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
