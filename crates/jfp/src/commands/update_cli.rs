//! Update CLI command
//!
//! Checks for CLI updates and optionally installs them

use std::process::ExitCode;
use std::time::Duration;

use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Deserialize;
use serde::Serialize;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const GITHUB_OWNER: &str = "Dicklesworthstone";
const GITHUB_REPO: &str = "jeffreysprompts.com";
const RELEASE_API: &str = "https://api.github.com/repos/Dicklesworthstone/jeffreysprompts.com/releases/latest";
const UPDATE_COMMAND: &str =
    "cargo install --git https://github.com/Dicklesworthstone/jeffreysprompts.com jfp --force";

#[derive(Serialize)]
struct UpdateOutput {
    current_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    latest_version: Option<String>,
    update_available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    release_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: Option<String>,
}

fn normalize_version_tag(tag: &str) -> String {
    tag.trim().trim_start_matches('v').to_string()
}

fn parse_version(version: &str) -> (u64, u64, u64, bool) {
    let cleaned = normalize_version_tag(version);
    let numeric_part = cleaned.split('-').next().unwrap_or_default();
    let mut parts = numeric_part.split('.').map(|part| part.parse::<u64>().unwrap_or(0));
    let major = parts.next().unwrap_or(0);
    let minor = parts.next().unwrap_or(0);
    let patch = parts.next().unwrap_or(0);
    let is_prerelease = cleaned.contains('-');
    (major, minor, patch, is_prerelease)
}

fn compare_versions(current: &str, latest: &str) -> i8 {
    let (cur_major, cur_minor, cur_patch, cur_prerelease) = parse_version(current);
    let (lat_major, lat_minor, lat_patch, lat_prerelease) = parse_version(latest);

    if cur_major != lat_major {
        return if cur_major < lat_major { -1 } else { 1 };
    }
    if cur_minor != lat_minor {
        return if cur_minor < lat_minor { -1 } else { 1 };
    }
    if cur_patch != lat_patch {
        return if cur_patch < lat_patch { -1 } else { 1 };
    }

    if cur_prerelease && !lat_prerelease {
        return -1;
    }
    if !cur_prerelease && lat_prerelease {
        return 1;
    }

    0
}

fn fetch_latest_release() -> Result<Option<GithubRelease>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to initialize HTTP client: {e}"))?;

    let response = client
        .get(RELEASE_API)
        .header(ACCEPT, "application/vnd.github+json")
        .header(USER_AGENT, format!("jfp-rust/{VERSION}"))
        .send()
        .map_err(|e| format!("Failed to reach GitHub API: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return match status.as_u16() {
            404 => Ok(None),
            403 => Err("GitHub API rate limit exceeded. Try again later.".to_string()),
            _ => Err(format!("GitHub API error: {} {}", status.as_u16(), status)),
        };
    }

    let release: GithubRelease = response
        .json()
        .map_err(|e| format!("Failed to parse GitHub release response: {e}"))?;

    if release.tag_name.trim().is_empty() {
        return Err("GitHub release response did not contain a tag name.".to_string());
    }

    Ok(Some(release))
}

fn print_output(output: &UpdateOutput, use_json: bool, show_manual_update: bool) -> ExitCode {
    if use_json {
        match serde_json::to_string_pretty(output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                eprintln!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
        return if output.error.is_some() {
            ExitCode::FAILURE
        } else {
            ExitCode::SUCCESS
        };
    }

    println!("jfp version {}", output.current_version);
    println!();

    if let Some(error) = &output.error {
        eprintln!("Update check failed: {error}");
        eprintln!();
        eprintln!("Try checking manually:");
        eprintln!("  - GitHub: https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases");
        return ExitCode::FAILURE;
    }

    if let Some(message) = &output.message {
        println!("{message}");
    }

    if let Some(release_url) = &output.release_url {
        println!("Release page: {release_url}");
    }

    if show_manual_update {
        println!();
        println!("To install/update manually:");
        println!("  {UPDATE_COMMAND}");
    }

    ExitCode::SUCCESS
}

pub fn run(check_only: bool, force: bool, use_json: bool) -> ExitCode {
    let release = match fetch_latest_release() {
        Ok(Some(release)) => release,
        Ok(None) => {
            let output = UpdateOutput {
                current_version: VERSION.to_string(),
                latest_version: None,
                update_available: false,
                release_url: None,
                message: Some(format!(
                    "No published GitHub releases found yet for {GITHUB_OWNER}/{GITHUB_REPO}."
                )),
                error: None,
            };
            return print_output(&output, use_json, false);
        }
        Err(err) => {
            let output = UpdateOutput {
                current_version: VERSION.to_string(),
                latest_version: None,
                update_available: false,
                release_url: None,
                message: Some("Unable to check for updates right now.".to_string()),
                error: Some(err),
            };
            return print_output(&output, use_json, false);
        }
    };

    let latest_version = normalize_version_tag(&release.tag_name);
    let comparison = compare_versions(VERSION, &latest_version);
    let update_available = comparison < 0;

    let message = if comparison < 0 {
        if check_only {
            format!("Update available: {VERSION} -> {latest_version}")
        } else {
            format!(
                "Update available: {VERSION} -> {latest_version}. Auto-update is not implemented yet."
            )
        }
    } else if comparison > 0 {
        format!(
            "You are running a newer version ({VERSION}) than the latest release ({latest_version})."
        )
    } else if force {
        format!(
            "Current version ({VERSION}) matches the latest release. --force requested; reinstall manually."
        )
    } else {
        format!("You are running the latest version ({VERSION}).")
    };

    let output = UpdateOutput {
        current_version: VERSION.to_string(),
        latest_version: Some(latest_version),
        update_available,
        release_url: release.html_url,
        message: Some(message),
        error: None,
    };

    let show_manual_update = update_available || force;
    print_output(&output, use_json, show_manual_update)
}

#[cfg(test)]
mod tests {
    use super::{compare_versions, normalize_version_tag, parse_version};

    #[test]
    fn normalize_version_tag_strips_v_prefix() {
        assert_eq!(normalize_version_tag("v1.2.3"), "1.2.3");
        assert_eq!(normalize_version_tag("1.2.3"), "1.2.3");
    }

    #[test]
    fn parse_version_handles_prerelease_suffixes() {
        assert_eq!(parse_version("v2.10.3"), (2, 10, 3, false));
        assert_eq!(parse_version("1.0.0-beta.1"), (1, 0, 0, true));
    }

    #[test]
    fn compare_versions_matches_expected_ordering() {
        assert_eq!(compare_versions("1.0.0", "1.0.1"), -1);
        assert_eq!(compare_versions("1.2.0", "1.1.9"), 1);
        assert_eq!(compare_versions("1.0.0", "1.0.0"), 0);
        assert_eq!(compare_versions("1.0.0-beta", "1.0.0"), -1);
        assert_eq!(compare_versions("1.0.0", "1.0.0-beta"), 1);
    }
}
