//! jfp - Agent-optimized CLI for JeffreysPrompts.com
//!
//! This is the Rust port of the jfp CLI, providing feature parity with the
//! original Bun/TypeScript implementation while adding robust SQLite storage
//! and improved performance.

use clap::{CommandFactory, Parser, Subcommand};
use std::io::IsTerminal;
use std::process::ExitCode;

mod cli;
mod commands;
mod config;
mod registry;
mod storage;
mod types;

/// jfp - Agent-optimized CLI for JeffreysPrompts.com
///
/// Browse, search, and use curated prompts for AI coding agents.
/// Supports JSON output for programmatic access.
#[derive(Parser, Debug)]
#[command(name = "jfp")]
#[command(version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    /// Disable colored output
    #[arg(long, global = true, env = "NO_COLOR")]
    no_color: bool,

    /// Output in JSON format (also enabled when stdout is not a TTY)
    #[arg(long, short, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// List all available prompts
    #[command(visible_alias = "ls")]
    List {
        /// Filter by category
        #[arg(long, short)]
        category: Option<String>,

        /// Filter by tag
        #[arg(long, short)]
        tag: Option<String>,

        /// Show only featured prompts
        #[arg(long)]
        featured: bool,
    },

    /// Search prompts by keyword
    Search {
        /// Search query
        query: String,

        /// Maximum number of results
        #[arg(long, short, default_value = "10")]
        limit: usize,
    },

    /// Show details for a specific prompt
    Show {
        /// Prompt ID
        id: String,

        /// Show raw content only
        #[arg(long)]
        raw: bool,
    },

    /// Copy prompt content to clipboard
    Copy {
        /// Prompt ID
        id: String,

        /// Fill template variables interactively
        #[arg(long)]
        fill: bool,
    },

    /// Render prompt with variable substitution
    Render {
        /// Prompt ID
        id: String,

        /// Fill variables interactively
        #[arg(long)]
        fill: bool,

        /// Context file path for variable substitution
        #[arg(long)]
        context: Option<String>,
    },

    /// Interactive prompt picker (fzf-style)
    #[command(visible_alias = "i")]
    Interactive,

    /// Export prompts to files
    Export {
        /// Prompt IDs to export (or 'all')
        ids: Vec<String>,

        /// Output format (md, skill)
        #[arg(long, short, default_value = "md")]
        format: String,

        /// Output directory
        #[arg(long, short)]
        output_dir: Option<String>,

        /// Write to stdout instead of files
        #[arg(long)]
        stdout: bool,
    },

    /// Suggest prompts for a task
    Suggest {
        /// Task description
        task: String,

        /// Maximum suggestions
        #[arg(long, short, default_value = "5")]
        limit: usize,

        /// Use semantic search
        #[arg(long)]
        semantic: bool,
    },

    /// List available categories
    Categories,

    /// List available tags
    Tags,

    /// List available bundles
    Bundles,

    /// Show bundle details
    Bundle {
        /// Bundle ID
        id: String,
    },

    /// Get a random prompt
    Random {
        /// Filter by category
        #[arg(long, short)]
        category: Option<String>,

        /// Filter by tag
        #[arg(long, short)]
        tag: Option<String>,

        /// Copy to clipboard
        #[arg(long)]
        copy: bool,
    },

    /// Show configuration
    Config {
        /// Action: get, set, list, reset, path
        #[arg(default_value = "list")]
        action: String,

        /// Config key
        key: Option<String>,

        /// Config value (for set)
        value: Option<String>,
    },

    /// Show registry cache status
    Status,

    /// Refresh local registry cache
    Refresh,

    /// Check for CLI updates
    #[command(name = "update-cli")]
    UpdateCli {
        /// Only check, don't install
        #[arg(long)]
        check: bool,

        /// Force update even if current version
        #[arg(long)]
        force: bool,
    },

    /// Generate shell completions
    Completion {
        /// Shell type (bash, zsh, fish, powershell)
        #[arg(long, default_value = "bash")]
        shell: String,
    },

    /// Run environment diagnostics
    Doctor,

    /// Open prompt in browser
    Open {
        /// Prompt ID
        id: String,
    },

    /// About JeffreysPrompts
    About,
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    // Handle no-color globally (will be used when color output is implemented)
    let _no_color = cli.no_color || std::env::var("JFP_NO_COLOR").is_ok() || std::env::var("NO_COLOR").is_ok();

    // Determine if JSON output should be used
    let use_json = cli.json || !std::io::stdout().is_terminal();

    // If no command, show help
    let Some(command) = cli.command else {
        // TODO: Print styled help
        println!("jfp - Agent-optimized CLI for JeffreysPrompts.com");
        println!();
        println!("Usage: jfp <COMMAND>");
        println!();
        println!("Run 'jfp --help' for available commands.");
        return ExitCode::SUCCESS;
    };

    // Dispatch to command handlers
    match command {
        Commands::List { category, tag, featured } => {
            commands::list::run(category, tag, featured, use_json)
        }
        Commands::Search { query, limit } => {
            commands::search::run(&query, limit, use_json)
        }
        Commands::Show { id, raw } => {
            commands::show::run(&id, raw, use_json)
        }
        Commands::Categories => {
            commands::categories::run(use_json)
        }
        Commands::Tags => {
            commands::tags::run(use_json)
        }
        Commands::About => {
            commands::about::run(use_json)
        }
        Commands::Random { category, tag, copy } => {
            commands::random::run(category, tag, copy, use_json)
        }
        Commands::Open { id } => {
            commands::open::run(&id, use_json)
        }
        Commands::Doctor => {
            commands::doctor::run(use_json)
        }
        Commands::Completion { shell } => {
            commands::completion::run(&shell, Cli::command())
        }
        Commands::Config { action, key, value } => {
            commands::config::run(&action, key, value, use_json)
        }
        Commands::Status => {
            commands::status::run(use_json)
        }
        Commands::Copy { id, fill } => {
            commands::copy::run(&id, fill, use_json)
        }
        Commands::Export { ids, format, output_dir, stdout } => {
            commands::export::run(ids, &format, output_dir, stdout, use_json)
        }
        Commands::Refresh => {
            commands::refresh::run(use_json)
        }
        Commands::Render { id, fill, context } => {
            commands::render::run(&id, fill, context, use_json)
        }
        Commands::Suggest { task, limit, semantic } => {
            commands::suggest::run(&task, limit, semantic, use_json)
        }
        Commands::Bundles => {
            commands::bundles::list_bundles(use_json)
        }
        Commands::Bundle { id } => {
            commands::bundles::show_bundle(&id, use_json)
        }
        Commands::Interactive => {
            commands::interactive::run(use_json)
        }
        Commands::UpdateCli { check, force } => {
            commands::update_cli::run(check, force, use_json)
        }
    }
}
