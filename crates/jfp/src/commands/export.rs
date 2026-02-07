//! Export command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 11 (export):
//! - Export prompts to markdown or skill format
//! - Write to files or stdout
//! - Export single, multiple, or all prompts

use std::fs;
use std::path::{Component, Path};
use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;
use crate::storage::Database;
use crate::types::Prompt;

#[derive(Serialize)]
struct ExportOutput {
    exported: Vec<ExportedPrompt>,
    count: usize,
    format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_dir: Option<String>,
}

#[derive(Serialize)]
struct ExportedPrompt {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    file: Option<String>,
}

fn build_safe_export_filename(prompt_id: &str, ext: &str) -> Result<String, String> {
    let id = prompt_id.trim();

    if id.is_empty() {
        return Err("prompt id is empty".to_string());
    }

    let mut components = Path::new(id).components();
    match (components.next(), components.next()) {
        (Some(Component::Normal(_)), None) => {}
        _ => {
            return Err(
                "prompt id must be a single path segment (no separators or relative segments)"
                    .to_string(),
            )
        }
    }

    let is_safe_char = |ch: char| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.';
    if !id.chars().all(is_safe_char) {
        return Err(
            "prompt id contains unsupported characters (allowed: a-z, A-Z, 0-9, -, _, .)"
                .to_string(),
        );
    }

    if id == "." || id == ".." {
        return Err("prompt id cannot be '.' or '..'".to_string());
    }

    Ok(format!("{}.{}", id, ext))
}

pub fn run(
    ids: Vec<String>,
    format: &str,
    output_dir: Option<String>,
    stdout: bool,
    use_json: bool,
) -> ExitCode {
    // Validate format
    if format != "md" && format != "skill" {
        if use_json {
            println!(r#"{{"error": "invalid_format", "format": "{}"}}"#, format);
        } else {
            eprintln!("Invalid format '{}'. Use 'md' or 'skill'", format);
        }
        return ExitCode::FAILURE;
    }

    // Open database
    let db = match Database::open() {
        Ok(db) => db,
        Err(e) => {
            if use_json {
                eprintln!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
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

    // Get prompts to export
    let prompts: Vec<Prompt> = if ids.is_empty() || (ids.len() == 1 && ids[0] == "all") {
        // Export all
        match db.list_prompts_filtered(None, None, false) {
            Ok(p) => p,
            Err(e) => {
                if use_json {
                    eprintln!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
                } else {
                    eprintln!("Error listing prompts: {}", e);
                }
                return ExitCode::FAILURE;
            }
        }
    } else {
        // Export specific IDs
        let mut prompts = Vec::new();
        for id in &ids {
            match db.get_prompt(id) {
                Ok(Some(p)) => prompts.push(p),
                Ok(None) => {
                    if use_json {
                        eprintln!(r#"{{"error": "not_found", "id": "{}"}}"#, id);
                    } else {
                        eprintln!("Warning: Prompt '{}' not found, skipping", id);
                    }
                }
                Err(e) => {
                    if use_json {
                        eprintln!(r#"{{"error": "database_error", "message": "{}"}}"#, e);
                    } else {
                        eprintln!("Error getting prompt '{}': {}", id, e);
                    }
                }
            }
        }
        prompts
    };

    if prompts.is_empty() {
        if use_json {
            println!(r#"{{"error": "no_prompts"}}"#);
        } else {
            eprintln!("No prompts to export");
        }
        return ExitCode::FAILURE;
    }

    // Export
    let mut exported = Vec::new();

    if stdout {
        // Write to stdout
        for prompt in &prompts {
            let content = format_prompt(prompt, format);
            if !use_json {
                println!("{}", content);
                if prompts.len() > 1 {
                    println!("\n---\n");
                }
            }
            exported.push(ExportedPrompt {
                id: prompt.id.clone(),
                file: None,
            });
        }
    } else {
        // Write to files
        let dir = output_dir.as_deref().unwrap_or(".");
        let dir_path = Path::new(dir);

        // Create directory if needed
        if !dir_path.exists() {
            if let Err(e) = fs::create_dir_all(dir_path) {
                if use_json {
                    eprintln!(r#"{{"error": "mkdir_error", "message": "{}"}}"#, e);
                } else {
                    eprintln!("Error creating directory: {}", e);
                }
                return ExitCode::FAILURE;
            }
        }

        let canonical_dir = match fs::canonicalize(dir_path) {
            Ok(path) => path,
            Err(e) => {
                if use_json {
                    eprintln!(r#"{{"error": "canonicalize_error", "message": "{}"}}"#, e);
                } else {
                    eprintln!("Error resolving output directory: {}", e);
                }
                return ExitCode::FAILURE;
            }
        };

        for prompt in &prompts {
            let ext = if format == "skill" { "md" } else { "md" };
            let filename = match build_safe_export_filename(&prompt.id, ext) {
                Ok(name) => name,
                Err(err) => {
                    if use_json {
                        eprintln!(
                            r#"{{"error": "invalid_prompt_id", "id": "{}", "message": "{}"}}"#,
                            prompt.id, err
                        );
                    } else {
                        eprintln!("Skipping unsafe prompt id '{}': {}", prompt.id, err);
                    }
                    continue;
                }
            };
            let path = dir_path.join(&filename);

            let parent = path.parent().unwrap_or(dir_path);
            match fs::canonicalize(parent) {
                Ok(canonical_parent) if canonical_parent == canonical_dir => {}
                Ok(_) => {
                    if use_json {
                        eprintln!(
                            r#"{{"error": "path_escape_detected", "id": "{}", "file": "{}"}}"#,
                            prompt.id, filename
                        );
                    } else {
                        eprintln!("Refusing to write '{}' outside output directory", filename);
                    }
                    continue;
                }
                Err(e) => {
                    if use_json {
                        eprintln!(
                            r#"{{"error": "canonicalize_error", "id": "{}", "message": "{}"}}"#,
                            prompt.id, e
                        );
                    } else {
                        eprintln!("Error resolving export path for '{}': {}", prompt.id, e);
                    }
                    continue;
                }
            }

            let content = format_prompt(prompt, format);

            match fs::write(&path, &content) {
                Ok(()) => {
                    if !use_json {
                        println!("Exported: {}", path.display());
                    }
                    exported.push(ExportedPrompt {
                        id: prompt.id.clone(),
                        file: Some(path.display().to_string()),
                    });
                }
                Err(e) => {
                    if use_json {
                        eprintln!(r#"{{"error": "write_error", "id": "{}", "message": "{}"}}"#, prompt.id, e);
                    } else {
                        eprintln!("Error writing {}: {}", path.display(), e);
                    }
                }
            }
        }
    }

    if use_json {
        let output = ExportOutput {
            count: exported.len(),
            exported,
            format: format.to_string(),
            output_dir,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                eprintln!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else if !stdout {
        println!("\nExported {} prompt(s)", exported.len());
    }

    ExitCode::SUCCESS
}

/// Format a prompt for export
fn format_prompt(prompt: &Prompt, format: &str) -> String {
    let mut output = String::new();

    match format {
        "skill" => {
            // Skill format (SKILL.md style)
            output.push_str(&format!("# {}\n\n", prompt.title));

            if let Some(desc) = &prompt.description {
                output.push_str(&format!("> {}\n\n", desc));
            }

            output.push_str("## Metadata\n\n");
            output.push_str(&format!("- **ID**: {}\n", prompt.id));
            if let Some(cat) = &prompt.category {
                output.push_str(&format!("- **Category**: {}\n", cat));
            }
            if !prompt.tags.is_empty() {
                output.push_str(&format!("- **Tags**: {}\n", prompt.tags.join(", ")));
            }
            output.push('\n');

            if !prompt.variables.is_empty() {
                output.push_str("## Variables\n\n");
                for var in &prompt.variables {
                    output.push_str(&format!("- `{{{{{}}}}}`", var.name));
                    if let Some(desc) = &var.description {
                        output.push_str(&format!(": {}", desc));
                    }
                    if let Some(def) = &var.default {
                        output.push_str(&format!(" (default: {})", def));
                    }
                    output.push('\n');
                }
                output.push('\n');
            }

            output.push_str("## Prompt\n\n");
            output.push_str("```\n");
            output.push_str(&prompt.content);
            output.push_str("\n```\n");
        }
        _ => {
            // Standard markdown
            output.push_str(&format!("# {}\n\n", prompt.title));

            if let Some(desc) = &prompt.description {
                output.push_str(&format!("{}\n\n", desc));
            }

            if let Some(cat) = &prompt.category {
                output.push_str(&format!("**Category**: {}\n\n", cat));
            }

            if !prompt.tags.is_empty() {
                output.push_str(&format!("**Tags**: {}\n\n", prompt.tags.join(", ")));
            }

            output.push_str("---\n\n");
            output.push_str(&prompt.content);
            output.push('\n');
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use super::build_safe_export_filename;

    #[test]
    fn build_safe_export_filename_accepts_slug_like_ids() {
        let name = build_safe_export_filename("idea-wizard_2.0", "md").expect("valid id");
        assert_eq!(name, "idea-wizard_2.0.md");
    }

    #[test]
    fn build_safe_export_filename_rejects_path_segments() {
        let err = build_safe_export_filename("../../etc/passwd", "md").expect_err("must reject");
        assert!(err.contains("single path segment"));
    }

    #[test]
    fn build_safe_export_filename_rejects_unsupported_chars() {
        let err = build_safe_export_filename("bad$id", "md").expect_err("must reject");
        assert!(err.contains("unsupported characters"));
    }
}
