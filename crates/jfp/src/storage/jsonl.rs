//! JSONL export/import for backup and recovery
//!
//! From rust-cli-with-sqlite skill:
//! - Atomic JSONL write (temp + fsync + rename)
//! - Version markers in both stores
//! - One-way sync only

use std::fs::{self, File};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::Path;

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::Database;
use crate::types::Prompt;

/// JSONL metadata header (first line)
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonlMeta {
    #[serde(rename = "_meta")]
    pub meta: MetaInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetaInfo {
    pub version: String,
    pub count: usize,
    pub exported_at: String,
    pub schema_version: i32,
}

/// Export prompts to JSONL file
///
/// Uses atomic write pattern from rust-cli-with-sqlite skill:
/// 1. Write to temp file
/// 2. fsync
/// 3. Atomic rename
pub fn export_jsonl(db: &Database, path: &Path) -> Result<usize> {
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Get all prompts
    let prompts = db.list_prompts()?;
    let count = prompts.len();

    // Create temp file in same directory for atomic rename
    let temp_path = path.with_extension("jsonl.tmp");

    {
        let file = File::create(&temp_path)
            .with_context(|| format!("Failed to create temp file: {:?}", temp_path))?;
        let mut writer = BufWriter::new(file);

        // Write metadata header
        let meta = JsonlMeta {
            meta: MetaInfo {
                version: get_data_version(db),
                count,
                exported_at: Utc::now().to_rfc3339(),
                schema_version: crate::storage::SCHEMA_VERSION,
            },
        };
        serde_json::to_writer(&mut writer, &meta)?;
        writeln!(writer)?;

        // Write each prompt as a line
        for prompt in &prompts {
            serde_json::to_writer(&mut writer, prompt)?;
            writeln!(writer)?;
        }

        // Flush and fsync
        writer.flush()?;
        writer.into_inner()?.sync_all()?;
    }

    // Atomic rename
    //
    // On Windows, std::fs::rename fails if destination already exists.
    // Remove existing file first so repeated exports succeed across platforms.
    #[cfg(windows)]
    if path.exists() {
        fs::remove_file(path)
            .with_context(|| format!("Failed to replace existing JSONL file: {:?}", path))?;
    }

    fs::rename(&temp_path, path)
        .with_context(|| format!("Failed to rename {:?} to {:?}", temp_path, path))?;

    // Update version marker in DB
    update_data_version(db)?;

    Ok(count)
}

/// Import prompts from JSONL file
///
/// Replaces all prompts in database with contents of JSONL file.
/// Uses transaction for atomicity.
pub fn import_jsonl(db: &mut Database, path: &Path) -> Result<usize> {
    let file =
        File::open(path).with_context(|| format!("Failed to open JSONL file: {:?}", path))?;
    let reader = BufReader::new(file);

    let mut prompts = Vec::new();
    let mut line_num = 0;
    let mut saw_first_non_empty = false;

    for line in reader.lines() {
        line_num += 1;
        let line = line.with_context(|| format!("Failed to read line {}", line_num))?;

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // The first non-empty line may be metadata. Only treat it as metadata
        // when it is an object with a top-level "_meta" key.
        if !saw_first_non_empty {
            saw_first_non_empty = true;
            let parsed_first_line = serde_json::from_str::<Value>(trimmed)
                .with_context(|| format!("Failed to parse JSON at line {}", line_num))?;
            if parsed_first_line.get("_meta").is_some() {
                let _meta: JsonlMeta =
                    serde_json::from_value(parsed_first_line).with_context(|| {
                        format!("Failed to parse JSONL metadata at line {}", line_num)
                    })?;
                continue;
            }
        }

        // Parse prompt
        let prompt: Prompt = serde_json::from_str(trimmed)
            .with_context(|| format!("Failed to parse prompt at line {}", line_num))?;
        prompts.push(prompt);
    }

    // Bulk import with transaction
    db.bulk_upsert_prompts(&prompts)?;

    // Update version marker
    update_data_version(db)?;

    Ok(prompts.len())
}

/// Get current data version from DB
fn get_data_version(db: &Database) -> String {
    db.get_meta("data_version")
        .unwrap_or_else(|_| Utc::now().to_rfc3339())
}

/// Update data version marker
fn update_data_version(db: &Database) -> Result<()> {
    db.set_meta("data_version", &Utc::now().to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_export_import_roundtrip() -> Result<()> {
        let dir = tempdir()?;
        let jsonl_path = dir.path().join("prompts.jsonl");

        // Create DB and add prompts
        let mut db = Database::in_memory()?;
        let prompts = vec![
            Prompt::new("test-1", "Test One", "Content one"),
            Prompt::new("test-2", "Test Two", "Content two"),
        ];
        db.bulk_upsert_prompts(&prompts)?;

        // Export
        let exported = export_jsonl(&db, &jsonl_path)?;
        assert_eq!(exported, 2);
        assert!(jsonl_path.exists());

        // Create new DB and import
        let mut db2 = Database::in_memory()?;
        let imported = import_jsonl(&mut db2, &jsonl_path)?;
        assert_eq!(imported, 2);

        // Verify
        let loaded = db2.list_prompts()?;
        assert_eq!(loaded.len(), 2);
        assert!(loaded.iter().any(|p| p.id == "test-1"));
        assert!(loaded.iter().any(|p| p.id == "test-2"));
        Ok(())
    }

    #[test]
    fn test_export_creates_metadata_header() -> Result<()> {
        let dir = tempdir()?;
        let jsonl_path = dir.path().join("prompts.jsonl");

        let db = Database::in_memory()?;
        export_jsonl(&db, &jsonl_path)?;

        // Read first line
        let content = fs::read_to_string(&jsonl_path)?;
        let first_line = content.lines().next().ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "missing JSONL metadata header",
            )
        })?;
        assert!(first_line.contains("\"_meta\""));
        assert!(first_line.contains("\"exported_at\""));
        Ok(())
    }

    #[test]
    fn test_import_does_not_skip_first_prompt_with_meta_in_content() -> Result<()> {
        let dir = tempdir()?;
        let jsonl_path = dir.path().join("prompts.jsonl");
        let first_prompt = Prompt::new(
            "first",
            "First",
            r#"content mentioning "_meta" should still import"#,
        );
        let second_prompt = Prompt::new("second", "Second", "second content");
        let first_line = serde_json::to_string(&first_prompt)?;
        let second_line = serde_json::to_string(&second_prompt)?;
        fs::write(&jsonl_path, format!("{}\n{}\n", first_line, second_line))?;

        let mut db = Database::in_memory()?;
        let imported = import_jsonl(&mut db, &jsonl_path)?;
        assert_eq!(imported, 2);

        let loaded = db.list_prompts()?;
        assert!(loaded.iter().any(|p| p.id == "first"));
        assert!(loaded.iter().any(|p| p.id == "second"));
        Ok(())
    }

    #[test]
    fn test_export_can_replace_existing_jsonl_file() -> Result<()> {
        let dir = tempdir()?;
        let jsonl_path = dir.path().join("prompts.jsonl");

        let mut db = Database::in_memory()?;
        db.bulk_upsert_prompts(&[Prompt::new("first", "First", "first content")])?;
        export_jsonl(&db, &jsonl_path)?;

        db.bulk_upsert_prompts(&[Prompt::new("second", "Second", "second content")])?;
        let exported = export_jsonl(&db, &jsonl_path)?;
        assert_eq!(exported, 2);

        let mut imported_db = Database::in_memory()?;
        let imported = import_jsonl(&mut imported_db, &jsonl_path)?;
        assert_eq!(imported, 2);
        Ok(())
    }
}
