//! Doctor command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 17 (doctor):
//! - Runs environment diagnostics
//! - Checks database, config, network connectivity, etc.

use std::process::ExitCode;

use serde::Serialize;

use crate::storage::Database;

#[derive(Serialize)]
struct DoctorOutput {
    checks: Vec<Check>,
    all_passed: bool,
}

#[derive(Serialize)]
struct Check {
    name: String,
    status: CheckStatus,
    message: String,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum CheckStatus {
    Pass,
    Warn,
    Fail,
}

impl std::fmt::Display for CheckStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CheckStatus::Pass => write!(f, "PASS"),
            CheckStatus::Warn => write!(f, "WARN"),
            CheckStatus::Fail => write!(f, "FAIL"),
        }
    }
}

pub fn run(use_json: bool) -> ExitCode {
    let mut checks = Vec::new();

    // Check 1: Database
    checks.push(check_database());

    // Check 2: Bundled prompts
    checks.push(check_bundled_prompts());

    // Check 3: Data directory
    checks.push(check_data_dir());

    // Check 4: Clipboard tools
    checks.push(check_clipboard());

    // Check 5: Browser opener
    checks.push(check_browser_opener());

    let all_passed = checks.iter().all(|c| c.status == CheckStatus::Pass);

    if use_json {
        let output = DoctorOutput { checks, all_passed };
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("jfp doctor - Environment Diagnostics\n");

        for check in &checks {
            let symbol = match check.status {
                CheckStatus::Pass => "+",
                CheckStatus::Warn => "~",
                CheckStatus::Fail => "x",
            };
            println!("[{}] {}: {}", symbol, check.name, check.message);
        }

        println!();
        if all_passed {
            println!("All checks passed!");
        } else {
            println!("Some checks failed or have warnings.");
        }
    }

    if all_passed {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}

fn check_database() -> Check {
    match Database::open() {
        Ok(db) => {
            let count = db.prompt_count().unwrap_or(0);
            Check {
                name: "Database".to_string(),
                status: CheckStatus::Pass,
                message: format!("OK ({} prompts)", count),
            }
        }
        Err(e) => Check {
            name: "Database".to_string(),
            status: CheckStatus::Fail,
            message: format!("Failed to open: {}", e),
        },
    }
}

fn check_bundled_prompts() -> Check {
    let prompts = crate::registry::bundled_prompts();
    if prompts.is_empty() {
        Check {
            name: "Bundled Prompts".to_string(),
            status: CheckStatus::Fail,
            message: "No bundled prompts found".to_string(),
        }
    } else {
        Check {
            name: "Bundled Prompts".to_string(),
            status: CheckStatus::Pass,
            message: format!("{} prompts available", prompts.len()),
        }
    }
}

fn check_data_dir() -> Check {
    if let Some(data_dir) = dirs::data_dir() {
        let jfp_dir = data_dir.join("jfp");
        if jfp_dir.exists() {
            Check {
                name: "Data Directory".to_string(),
                status: CheckStatus::Pass,
                message: format!("{}", jfp_dir.display()),
            }
        } else {
            Check {
                name: "Data Directory".to_string(),
                status: CheckStatus::Warn,
                message: format!("{} (will be created on first use)", jfp_dir.display()),
            }
        }
    } else {
        Check {
            name: "Data Directory".to_string(),
            status: CheckStatus::Fail,
            message: "Could not determine data directory".to_string(),
        }
    }
}

fn check_clipboard() -> Check {
    use std::process::Command;

    #[cfg(target_os = "macos")]
    let (cmd, args) = ("which", vec!["pbcopy"]);

    #[cfg(target_os = "linux")]
    let (cmd, args) = ("which", vec!["xclip"]);

    #[cfg(target_os = "windows")]
    let (cmd, args) = ("where", vec!["clip"]);

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return Check {
        name: "Clipboard".to_string(),
        status: CheckStatus::Warn,
        message: "Platform not supported".to_string(),
    };

    match Command::new(cmd).args(&args).output() {
        Ok(output) if output.status.success() => Check {
            name: "Clipboard".to_string(),
            status: CheckStatus::Pass,
            message: "Clipboard tool available".to_string(),
        },
        _ => Check {
            name: "Clipboard".to_string(),
            status: CheckStatus::Warn,
            message: "Clipboard tool not found (--copy won't work)".to_string(),
        },
    }
}

fn check_browser_opener() -> Check {
    use std::process::Command;

    #[cfg(target_os = "macos")]
    let (cmd, args) = ("which", vec!["open"]);

    #[cfg(target_os = "linux")]
    let (cmd, args) = ("which", vec!["xdg-open"]);

    #[cfg(target_os = "windows")]
    let (cmd, args) = ("where", vec!["start"]);

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return Check {
        name: "Browser Opener".to_string(),
        status: CheckStatus::Warn,
        message: "Platform not supported".to_string(),
    };

    match Command::new(cmd).args(&args).output() {
        Ok(output) if output.status.success() => Check {
            name: "Browser Opener".to_string(),
            status: CheckStatus::Pass,
            message: "Browser opener available".to_string(),
        },
        _ => Check {
            name: "Browser Opener".to_string(),
            status: CheckStatus::Warn,
            message: "Browser opener not found (open command won't work)".to_string(),
        },
    }
}
