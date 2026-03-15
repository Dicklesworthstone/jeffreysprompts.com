//! Status command implementation
//!
//! From EXISTING_JFP_STRUCTURE.md section 14 (status):
//! - Shows registry cache status
//! - Shows cache freshness, prompt count, last update

use std::process::ExitCode;

use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::storage::Database;

#[derive(Serialize)]
struct StatusOutput {
    database: DatabaseStatus,
    cache: CacheStatus,
}

#[derive(Serialize)]
struct DatabaseStatus {
    path: String,
    exists: bool,
    prompt_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    schema_version: Option<i32>,
}

#[derive(Serialize)]
struct CacheStatus {
    #[serde(skip_serializing_if = "Option::is_none")]
    last_sync: Option<String>,
    stale: bool,
    source: String,
}

pub fn run(use_json: bool) -> ExitCode {
    // Get database status
    let db_path = crate::storage::db_path();
    let db_exists = db_path.exists();

    let (prompt_count, schema_version, last_sync) = if db_exists {
        match Database::open() {
            Ok(db) => {
                let count = db.prompt_count().unwrap_or(0);
                let version = Some(crate::storage::SCHEMA_VERSION);
                let sync = db.get_meta("last_sync").ok();
                (count, version, sync)
            }
            Err(_) => (0, None, None),
        }
    } else {
        (0, None, None)
    };

    // Determine cache staleness (> 1 hour old or no sync)
    let stale = match &last_sync {
        Some(ts) => {
            if let Ok(dt) = ts.parse::<DateTime<Utc>>() {
                let age = Utc::now().signed_duration_since(dt);
                age.num_hours() >= 1
            } else {
                true
            }
        }
        None => true,
    };

    // Determine source
    let source = if !db_exists {
        "bundled".to_string()
    } else if stale {
        "local (stale)".to_string()
    } else {
        "local".to_string()
    };

    let output = StatusOutput {
        database: DatabaseStatus {
            path: db_path.display().to_string(),
            exists: db_exists,
            prompt_count,
            schema_version,
        },
        cache: CacheStatus {
            last_sync,
            stale,
            source,
        },
    };

    if use_json {
        match serde_json::to_string_pretty(&output) {
            Ok(json) => println!("{}", json),
            Err(e) => {
                println!(r#"{{"error": "serialization_error", "message": "{}"}}"#, e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        println!("jfp Status\n");

        println!("Database:");
        println!("  Path: {}", output.database.path);
        println!("  Exists: {}", if output.database.exists { "yes" } else { "no" });
        println!("  Prompts: {}", output.database.prompt_count);
        if let Some(v) = output.database.schema_version {
            println!("  Schema version: {}", v);
        }

        println!("\nCache:");
        println!("  Source: {}", output.cache.source);
        println!("  Stale: {}", if output.cache.stale { "yes" } else { "no" });
        if let Some(ts) = &output.cache.last_sync {
            println!("  Last sync: {}", ts);
        } else {
            println!("  Last sync: never");
        }

        if output.cache.stale {
            println!("\nTip: Run 'jfp refresh' to update the cache");
        }
    }

    ExitCode::SUCCESS
}
