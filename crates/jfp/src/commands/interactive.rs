//! Interactive mode fallback implementation.
//!
//! This provides a simple searchable terminal picker for bundled prompts
//! without requiring the full Phase-5 TUI stack.

use std::io::{self, IsTerminal, Write};
use std::process::ExitCode;

use crate::registry::bundled_prompts;
use crate::types::Prompt;

fn prompt_line(prompt: &str) -> io::Result<String> {
    print!("{prompt}");
    io::stdout().flush()?;
    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    Ok(input.trim().to_string())
}

fn filter_prompts<'a>(prompts: &'a [Prompt], query: &str) -> Vec<&'a Prompt> {
    let normalized = query.trim().to_lowercase();
    if normalized.is_empty() {
        return prompts.iter().collect();
    }

    prompts
        .iter()
        .filter(|prompt| {
            prompt.id.to_lowercase().contains(&normalized)
                || prompt.title.to_lowercase().contains(&normalized)
                || prompt
                    .description
                    .as_ref()
                    .is_some_and(|description| description.to_lowercase().contains(&normalized))
                || prompt
                    .category
                    .as_ref()
                    .is_some_and(|category| category.to_lowercase().contains(&normalized))
                || prompt
                    .tags
                    .iter()
                    .any(|tag| tag.to_lowercase().contains(&normalized))
        })
        .collect()
}

fn render_prompt_details(prompt: &Prompt) -> String {
    let description = prompt
        .description
        .clone()
        .unwrap_or_else(|| "No description provided.".to_string());
    let category = prompt
        .category
        .clone()
        .unwrap_or_else(|| "uncategorized".to_string());
    let tags = if prompt.tags.is_empty() {
        "none".to_string()
    } else {
        prompt.tags.join(", ")
    };

    format!(
        "\n{} ({})\n{}\nCategory: {}\nTags: {}\n{}\n{}\n",
        prompt.title,
        prompt.id,
        description,
        category,
        tags,
        "-".repeat(72),
        prompt.content
    )
}

pub fn run(use_json: bool) -> ExitCode {
    if use_json {
        println!(
            r#"{{"error":"interactive_requires_tty","message":"Interactive mode requires a terminal and cannot be used with --json"}}"#
        );
        return ExitCode::FAILURE;
    }

    if !io::stdin().is_terminal() || !io::stdout().is_terminal() {
        eprintln!("Interactive mode requires a TTY.");
        eprintln!("Use `jfp search <query> --json` for non-interactive usage.");
        return ExitCode::FAILURE;
    }

    let mut prompts = bundled_prompts();
    if prompts.is_empty() {
        eprintln!("No prompts available.");
        return ExitCode::FAILURE;
    }
    prompts.sort_by_cached_key(|prompt| prompt.title.to_lowercase());

    println!("jfp interactive mode");
    println!("Type a search query and pick a prompt by number.");
    println!("Type `q` to quit.\n");

    loop {
        let query = match prompt_line("Search query (blank = all, q = quit): ") {
            Ok(value) => value,
            Err(err) => {
                eprintln!("Failed to read input: {err}");
                return ExitCode::FAILURE;
            }
        };

        if query.eq_ignore_ascii_case("q") || query.eq_ignore_ascii_case("quit") {
            println!("Goodbye.");
            return ExitCode::SUCCESS;
        }

        let matches = filter_prompts(&prompts, &query);
        if matches.is_empty() {
            println!("No prompts matched \"{}\".\n", query);
            continue;
        }

        println!("\nMatches:");
        for (index, prompt) in matches.iter().enumerate() {
            let category = prompt.category.as_deref().unwrap_or("uncategorized");
            println!("{:>2}. {} [{}]", index + 1, prompt.title, category);
        }

        let selection = match prompt_line("\nSelect # (b = back, q = quit): ") {
            Ok(value) => value,
            Err(err) => {
                eprintln!("Failed to read input: {err}");
                return ExitCode::FAILURE;
            }
        };

        if selection.eq_ignore_ascii_case("q") || selection.eq_ignore_ascii_case("quit") {
            println!("Goodbye.");
            return ExitCode::SUCCESS;
        }
        if selection.eq_ignore_ascii_case("b") || selection.eq_ignore_ascii_case("back") {
            println!();
            continue;
        }

        let selection_index = match selection.parse::<usize>() {
            Ok(number) if number >= 1 && number <= matches.len() => number - 1,
            _ => {
                println!("Invalid selection.\n");
                continue;
            }
        };

        let selected_prompt = matches[selection_index];
        println!("{}", render_prompt_details(selected_prompt));

        let next = match prompt_line("Press Enter to continue, or `q` to quit: ") {
            Ok(value) => value,
            Err(err) => {
                eprintln!("Failed to read input: {err}");
                return ExitCode::FAILURE;
            }
        };

        if next.eq_ignore_ascii_case("q") || next.eq_ignore_ascii_case("quit") {
            println!("Goodbye.");
            return ExitCode::SUCCESS;
        }

        println!();
    }
}

#[cfg(test)]
mod tests {
    use super::{filter_prompts, render_prompt_details};
    use crate::types::Prompt;

    fn sample_prompts() -> Vec<Prompt> {
        let mut prompt_a = Prompt::new("idea-wizard", "Idea Wizard", "Generate ideas");
        prompt_a.description = Some("Brainstorming helper".to_string());
        prompt_a.category = Some("ideation".to_string());
        prompt_a.tags = vec!["brainstorm".to_string()];

        let mut prompt_b = Prompt::new("debug-helper", "Debug Helper", "Debug issues");
        prompt_b.description = Some("Troubleshoot errors".to_string());
        prompt_b.category = Some("debugging".to_string());
        prompt_b.tags = vec!["bugfix".to_string(), "errors".to_string()];

        vec![prompt_a, prompt_b]
    }

    #[test]
    fn filter_prompts_returns_all_for_blank_query() {
        let prompts = sample_prompts();
        let matches = filter_prompts(&prompts, "");
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn filter_prompts_matches_tags_case_insensitively() {
        let prompts = sample_prompts();
        let matches = filter_prompts(&prompts, "BUGFIX");
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, "debug-helper");
    }

    #[test]
    fn render_prompt_details_includes_metadata_and_content() {
        let prompts = sample_prompts();
        let rendered = render_prompt_details(&prompts[0]);
        assert!(rendered.contains("Idea Wizard (idea-wizard)"));
        assert!(rendered.contains("Category: ideation"));
        assert!(rendered.contains("Tags: brainstorm"));
        assert!(rendered.contains("Generate ideas"));
    }
}
