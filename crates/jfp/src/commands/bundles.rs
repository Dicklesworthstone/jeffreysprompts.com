//! Bundles commands implementation
//!
//! From EXISTING_JFP_STRUCTURE.md sections for bundles/bundle:
//! - bundles: List available bundles
//! - bundle: Show bundle details

use std::collections::HashMap;
use std::process::ExitCode;

use serde::Serialize;

use crate::registry::bundled_prompts;

#[derive(Serialize)]
struct BundlesOutput {
    bundles: Vec<BundleSummary>,
    count: usize,
}

#[derive(Serialize)]
struct BundleSummary {
    id: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    prompt_count: usize,
}

#[derive(Serialize)]
struct BundleOutput {
    id: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    prompts: Vec<BundlePrompt>,
}

#[derive(Serialize)]
struct BundlePrompt {
    id: String,
    title: String,
}

struct BundleDefinition {
    id: &'static str,
    title: &'static str,
    description: &'static str,
    prompt_ids: &'static [&'static str],
}

const BUNDLE_DEFINITIONS: &[BundleDefinition] = &[
    BundleDefinition {
        id: "getting-started",
        title: "Getting Started",
        description: "Essential prompts for new users",
        prompt_ids: &["code-review", "debug", "explain-code"],
    },
    BundleDefinition {
        id: "quality-essentials",
        title: "Quality Essentials",
        description: "Core prompts for code quality and refactoring",
        prompt_ids: &["write-tests", "refactor", "optimize"],
    },
    BundleDefinition {
        id: "docs-and-design",
        title: "Docs & Design",
        description: "Prompts for documentation and API design",
        prompt_ids: &["documentation", "api-design", "explain-code"],
    },
];

fn prompt_title_map() -> HashMap<String, String> {
    bundled_prompts()
        .into_iter()
        .map(|prompt| (prompt.id, prompt.title))
        .collect()
}

fn build_bundle_summary(
    bundle: &BundleDefinition,
    titles_by_id: &HashMap<String, String>,
) -> BundleSummary {
    let prompt_count = bundle
        .prompt_ids
        .iter()
        .filter(|id| titles_by_id.contains_key(**id))
        .count();

    BundleSummary {
        id: bundle.id.to_string(),
        title: bundle.title.to_string(),
        description: Some(bundle.description.to_string()),
        prompt_count,
    }
}

fn build_bundle_output(
    bundle: &BundleDefinition,
    titles_by_id: &HashMap<String, String>,
) -> BundleOutput {
    let prompts = bundle
        .prompt_ids
        .iter()
        .filter_map(|prompt_id| {
            titles_by_id.get(*prompt_id).map(|title| BundlePrompt {
                id: (*prompt_id).to_string(),
                title: title.clone(),
            })
        })
        .collect();

    BundleOutput {
        id: bundle.id.to_string(),
        title: bundle.title.to_string(),
        description: Some(bundle.description.to_string()),
        prompts,
    }
}

/// List all available bundles
pub fn list_bundles(use_json: bool) -> ExitCode {
    let titles_by_id = prompt_title_map();
    let bundles: Vec<BundleSummary> = BUNDLE_DEFINITIONS
        .iter()
        .map(|bundle| build_bundle_summary(bundle, &titles_by_id))
        .collect();

    if use_json {
        let output = BundlesOutput {
            count: bundles.len(),
            bundles,
        };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("Available Bundles:\n");

        if bundles.is_empty() {
            println!("No bundles available yet.");
        } else {
            for bundle in &bundles {
                println!("  {} - {} ({} prompts)", bundle.id, bundle.title, bundle.prompt_count);
                if let Some(desc) = &bundle.description {
                    println!("    {}", desc);
                }
            }
        }

        println!("\nUse 'jfp bundle <id>' to see bundle contents");
    }

    ExitCode::SUCCESS
}

/// Show details for a specific bundle
pub fn show_bundle(id: &str, use_json: bool) -> ExitCode {
    let titles_by_id = prompt_title_map();
    let Some(bundle) = BUNDLE_DEFINITIONS.iter().find(|bundle| bundle.id == id) else {
        if use_json {
            println!(r#"{{"error": "not_found", "id": "{}"}}"#, id);
        } else {
            eprintln!("Bundle '{}' not found.", id);
            eprintln!("\nUse 'jfp bundles' to list available bundles");
        }
        return ExitCode::FAILURE;
    };

    let output = build_bundle_output(bundle, &titles_by_id);

    if use_json {
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("Bundle: {} - {}\n", output.id, output.title);
        if let Some(desc) = &output.description {
            println!("{}\n", desc);
        }
        println!("Prompts ({}):\n", output.prompts.len());
        for prompt in &output.prompts {
            println!("  - {} ({})", prompt.title, prompt.id);
        }
        println!("\nUse 'jfp show <id>' to view a prompt");
        println!("Use 'jfp copy <id>' to copy a prompt");
    }

    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn bundle_ids_are_unique() {
        let mut seen = HashSet::new();
        for bundle in BUNDLE_DEFINITIONS {
            assert!(
                seen.insert(bundle.id),
                "duplicate bundle id found: {}",
                bundle.id
            );
        }
    }

    #[test]
    fn bundle_prompt_ids_exist_in_embedded_prompts() {
        let titles_by_id = prompt_title_map();
        for bundle in BUNDLE_DEFINITIONS {
            for prompt_id in bundle.prompt_ids {
                assert!(
                    titles_by_id.contains_key(*prompt_id),
                    "bundle '{}' references missing prompt id '{}'",
                    bundle.id,
                    prompt_id
                );
            }
        }
    }

    #[test]
    fn bundle_output_prompt_count_matches_definition() {
        let titles_by_id = prompt_title_map();
        let bundle = BUNDLE_DEFINITIONS
            .iter()
            .find(|bundle| bundle.id == "getting-started")
            .expect("missing getting-started bundle");
        let output = build_bundle_output(bundle, &titles_by_id);
        assert_eq!(output.prompts.len(), bundle.prompt_ids.len());
    }
}
