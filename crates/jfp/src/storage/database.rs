//! Database operations
//!
//! From rust-cli-with-sqlite skill:
//! - WAL mode for concurrent access
//! - Busy timeout for lock handling
//! - Transactions for multi-step writes

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};

use super::schema::{CREATE_SCHEMA, SCHEMA_VERSION};
use crate::types::{Prompt, PromptVariable, VariableType};

/// Database wrapper with connection management
pub struct Database {
    conn: Connection,
}

/// Get the default database path
pub fn db_path() -> PathBuf {
    crate::config::cache_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("jfp.db")
}

impl Database {
    /// Open or create the database at the default location
    pub fn open() -> Result<Self> {
        let path = db_path();
        Self::open_at(&path)
    }

    /// Open or create the database at a specific path
    pub fn open_at(path: &Path) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(path)?;

        // Configure for performance and durability
        // From rust-cli-with-sqlite skill:
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "wal_autocheckpoint", 1000)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.busy_timeout(Duration::from_secs(5))?;

        let db = Self {
            conn,
        };

        // Initialize schema if needed
        db.init_schema()?;

        Ok(db)
    }

    /// Open an in-memory database (for testing)
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Self {
            conn,
        };

        db.init_schema()?;
        Ok(db)
    }

    /// Initialize the database schema
    fn init_schema(&self) -> Result<()> {
        // Check current version
        let version: i32 = self
            .conn
            .query_row(
                "SELECT value FROM registry_meta WHERE key = 'schema_version'",
                [],
                |row| row.get::<_, String>(0).map(|s| s.parse().unwrap_or(0)),
            )
            .unwrap_or(0);

        if version < SCHEMA_VERSION {
            self.conn.execute_batch(CREATE_SCHEMA)?;
            self.conn.execute(
                "INSERT OR REPLACE INTO registry_meta (key, value) VALUES ('schema_version', ?)",
                params![SCHEMA_VERSION.to_string()],
            )?;
        }

        Ok(())
    }

    /// Insert or update a prompt
    pub fn upsert_prompt(&self, prompt: &Prompt) -> Result<()> {
        let tags_text = prompt.tags.join(" ");

        self.conn.execute(
            r#"
            INSERT INTO prompts (id, title, content, description, category, tags_text, featured, version, author, saved_at, is_local)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                description = excluded.description,
                category = excluded.category,
                tags_text = excluded.tags_text,
                featured = excluded.featured,
                version = excluded.version,
                author = excluded.author,
                saved_at = excluded.saved_at,
                is_local = excluded.is_local,
                updated_at = datetime('now')
            "#,
            params![
                &prompt.id,
                &prompt.title,
                &prompt.content,
                &prompt.description,
                &prompt.category,
                &tags_text,
                prompt.featured as i32,
                &prompt.version,
                &prompt.author,
                &prompt.saved_at,
                prompt.is_local as i32,
            ],
        )?;

        // Update tags (normalized)
        self.conn.execute(
            "DELETE FROM prompt_tags WHERE prompt_id = ?",
            params![&prompt.id],
        )?;

        for tag in &prompt.tags {
            self.conn.execute(
                "INSERT INTO prompt_tags (prompt_id, tag) VALUES (?, ?)",
                params![&prompt.id, tag],
            )?;
        }

        // Update variables
        self.conn.execute(
            "DELETE FROM prompt_variables WHERE prompt_id = ?",
            params![&prompt.id],
        )?;

        for var in &prompt.variables {
            self.conn.execute(
                r#"
                INSERT INTO prompt_variables (prompt_id, name, var_type, required, description, default_value)
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
                params![
                    &prompt.id,
                    &var.name,
                    var_type_to_str(&var.var_type),
                    var.required as i32,
                    &var.description,
                    &var.default,
                ],
            )?;
        }

        // Update FTS index
        self.conn.execute(
            "DELETE FROM prompts_fts WHERE id = ?",
            params![&prompt.id],
        )?;

        self.conn.execute(
            r#"
            INSERT INTO prompts_fts (id, title, description, content, tags_text)
            VALUES (?, ?, ?, ?, ?)
            "#,
            params![
                &prompt.id,
                &prompt.title,
                &prompt.description,
                &prompt.content,
                &tags_text,
            ],
        )?;

        Ok(())
    }

    /// Bulk insert prompts (in a transaction)
    pub fn bulk_upsert_prompts(&mut self, prompts: &[Prompt]) -> Result<()> {
        let tx = self.conn.transaction()?;

        for prompt in prompts {
            tx.execute(
                r#"
                INSERT INTO prompts (id, title, content, description, category, featured, version, author, saved_at, is_local)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content,
                    description = excluded.description,
                    category = excluded.category,
                    featured = excluded.featured,
                    version = excluded.version,
                    author = excluded.author,
                    saved_at = excluded.saved_at,
                    is_local = excluded.is_local,
                    updated_at = datetime('now')
                "#,
                params![
                    &prompt.id,
                    &prompt.title,
                    &prompt.content,
                    &prompt.description,
                    &prompt.category,
                    prompt.featured as i32,
                    &prompt.version,
                    &prompt.author,
                    &prompt.saved_at,
                    prompt.is_local as i32,
                ],
            )?;

            // Tags
            tx.execute(
                "DELETE FROM prompt_tags WHERE prompt_id = ?",
                params![&prompt.id],
            )?;
            for tag in &prompt.tags {
                tx.execute(
                    "INSERT INTO prompt_tags (prompt_id, tag) VALUES (?, ?)",
                    params![&prompt.id, tag],
                )?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    /// Get a prompt by ID
    pub fn get_prompt(&self, id: &str) -> Result<Option<Prompt>> {
        let prompt = self
            .conn
            .query_row(
                r#"
                SELECT id, title, content, description, category, featured, version, author, saved_at, is_local
                FROM prompts WHERE id = ?
                "#,
                params![id],
                |row| {
                    Ok(Prompt {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        content: row.get(2)?,
                        description: row.get(3)?,
                        category: row.get(4)?,
                        tags: Vec::new(), // Filled below
                        variables: Vec::new(), // Filled below
                        featured: row.get::<_, i32>(5)? != 0,
                        version: row.get(6)?,
                        author: row.get(7)?,
                        saved_at: row.get(8)?,
                        is_local: row.get::<_, i32>(9)? != 0,
                    })
                },
            )
            .optional()?;

        let Some(mut prompt) = prompt else {
            return Ok(None);
        };

        // Load tags
        prompt.tags = self.get_prompt_tags(&prompt.id)?;

        // Load variables
        prompt.variables = self.get_prompt_variables(&prompt.id)?;

        Ok(Some(prompt))
    }

    /// Get tags for a prompt
    fn get_prompt_tags(&self, prompt_id: &str) -> Result<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT tag FROM prompt_tags WHERE prompt_id = ?")?;
        let tags = stmt
            .query_map(params![prompt_id], |row| row.get(0))?
            .collect::<std::result::Result<Vec<String>, _>>()?;
        Ok(tags)
    }

    /// Get variables for a prompt
    fn get_prompt_variables(&self, prompt_id: &str) -> Result<Vec<PromptVariable>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT name, var_type, required, description, default_value
            FROM prompt_variables WHERE prompt_id = ?
            "#,
        )?;

        let vars = stmt
            .query_map(params![prompt_id], |row| {
                Ok(PromptVariable {
                    name: row.get(0)?,
                    var_type: str_to_var_type(&row.get::<_, String>(1)?),
                    required: row.get::<_, i32>(2)? != 0,
                    description: row.get(3)?,
                    default: row.get(4)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(vars)
    }

    /// List all prompts
    pub fn list_prompts(&self) -> Result<Vec<Prompt>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, title, content, description, category, featured, version, author, saved_at, is_local
            FROM prompts ORDER BY title
            "#,
        )?;

        let prompts = stmt
            .query_map([], |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    description: row.get(3)?,
                    category: row.get(4)?,
                    tags: Vec::new(),
                    variables: Vec::new(),
                    featured: row.get::<_, i32>(5)? != 0,
                    version: row.get(6)?,
                    author: row.get(7)?,
                    saved_at: row.get(8)?,
                    is_local: row.get::<_, i32>(9)? != 0,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        // Load tags for each prompt
        let mut result = Vec::with_capacity(prompts.len());
        for mut prompt in prompts {
            prompt.tags = self.get_prompt_tags(&prompt.id)?;
            result.push(prompt);
        }

        Ok(result)
    }

    /// List prompts with optional filters
    pub fn list_prompts_filtered(
        &self,
        category: Option<&str>,
        tag: Option<&str>,
        featured_only: bool,
    ) -> Result<Vec<Prompt>> {
        let mut conditions = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(cat) = category {
            conditions.push("category = ?");
            params_vec.push(Box::new(cat.to_string()));
        }

        if let Some(t) = tag {
            conditions.push("id IN (SELECT prompt_id FROM prompt_tags WHERE tag = ?)");
            params_vec.push(Box::new(t.to_string()));
        }

        if featured_only {
            conditions.push("featured = 1");
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let sql = format!(
            r#"
            SELECT id, title, content, description, category, featured, version, author, saved_at, is_local
            FROM prompts {} ORDER BY title
            "#,
            where_clause
        );

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let prompts = stmt
            .query_map(params.as_slice(), |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    description: row.get(3)?,
                    category: row.get(4)?,
                    tags: Vec::new(),
                    variables: Vec::new(),
                    featured: row.get::<_, i32>(5)? != 0,
                    version: row.get(6)?,
                    author: row.get(7)?,
                    saved_at: row.get(8)?,
                    is_local: row.get::<_, i32>(9)? != 0,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        // Load tags for each prompt
        let mut result = Vec::with_capacity(prompts.len());
        for mut prompt in prompts {
            prompt.tags = self.get_prompt_tags(&prompt.id)?;
            result.push(prompt);
        }

        Ok(result)
    }

    /// Get category counts
    pub fn category_counts(&self) -> Result<Vec<(String, usize)>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT category, COUNT(*) as count
            FROM prompts
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY category
            "#,
        )?;

        let counts = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, usize>(1)?))
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(counts)
    }

    /// Get tag counts
    pub fn tag_counts(&self) -> Result<Vec<(String, usize)>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT tag, COUNT(*) as count
            FROM prompt_tags
            GROUP BY tag
            ORDER BY count DESC, tag
            "#,
        )?;

        let counts = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, usize>(1)?))
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(counts)
    }

    /// Get prompt count
    pub fn prompt_count(&self) -> Result<usize> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM prompts", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    /// Full-text search using FTS5
    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<(Prompt, f64)>> {
        // BM25 weights: id=5, title=3, description=2, content=1, tags=2
        let mut stmt = self.conn.prepare(
            r#"
            SELECT p.id, p.title, p.content, p.description, p.category,
                   p.featured, p.version, p.author, p.saved_at, p.is_local,
                   bm25(prompts_fts, 5.0, 3.0, 2.0, 1.0, 2.0) as score
            FROM prompts_fts f
            JOIN prompts p ON f.id = p.id
            WHERE prompts_fts MATCH ?
            ORDER BY score
            LIMIT ?
            "#,
        )?;

        let results = stmt
            .query_map(params![query, limit as i64], |row| {
                Ok((
                    Prompt {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        content: row.get(2)?,
                        description: row.get(3)?,
                        category: row.get(4)?,
                        tags: Vec::new(),
                        variables: Vec::new(),
                        featured: row.get::<_, i32>(5)? != 0,
                        version: row.get(6)?,
                        author: row.get(7)?,
                        saved_at: row.get(8)?,
                        is_local: row.get::<_, i32>(9)? != 0,
                    },
                    row.get::<_, f64>(10)?,
                ))
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        // Load tags for each result
        let mut final_results = Vec::with_capacity(results.len());
        for (mut prompt, score) in results {
            prompt.tags = self.get_prompt_tags(&prompt.id)?;
            final_results.push((prompt, -score)); // Negate because BM25 returns negative scores
        }

        Ok(final_results)
    }

    /// Run integrity check
    pub fn integrity_check(&self) -> Result<bool> {
        let result: String = self
            .conn
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
        Ok(result == "ok")
    }

    /// Checkpoint WAL
    #[allow(dead_code)]
    pub fn checkpoint(&self) -> Result<()> {
        self.conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)")?;
        Ok(())
    }

    /// Get metadata value
    pub fn get_meta(&self, key: &str) -> Result<String> {
        let value: String = self.conn.query_row(
            "SELECT value FROM registry_meta WHERE key = ?",
            rusqlite::params![key],
            |row| row.get(0),
        )?;
        Ok(value)
    }

    /// Set metadata value
    pub fn set_meta(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO registry_meta (key, value) VALUES (?, ?)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}

fn var_type_to_str(vt: &VariableType) -> &'static str {
    match vt {
        VariableType::Text => "text",
        VariableType::Multiline => "multiline",
        VariableType::File => "file",
        VariableType::Path => "path",
        VariableType::Select => "select",
    }
}

fn str_to_var_type(s: &str) -> VariableType {
    match s {
        "multiline" => VariableType::Multiline,
        "file" => VariableType::File,
        "path" => VariableType::Path,
        "select" => VariableType::Select,
        _ => VariableType::Text,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_open_in_memory() -> Result<()> {
        let db = Database::in_memory()?;
        assert!(db.integrity_check()?);
        Ok(())
    }

    #[test]
    fn test_upsert_and_get_prompt() -> Result<()> {
        let db = Database::in_memory()?;

        let prompt = Prompt {
            id: "test-1".to_string(),
            title: "Test Prompt".to_string(),
            content: "Test content".to_string(),
            description: Some("A test prompt".to_string()),
            category: Some("testing".to_string()),
            tags: vec!["rust".to_string(), "test".to_string()],
            variables: vec![],
            featured: true,
            version: Some("1.0.0".to_string()),
            author: Some("Test Author".to_string()),
            saved_at: None,
            is_local: false,
        };

        db.upsert_prompt(&prompt)?;

        let loaded = db.get_prompt("test-1")?.ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "expected prompt test-1 to exist after upsert",
            )
        })?;
        assert_eq!(loaded.id, "test-1");
        assert_eq!(loaded.title, "Test Prompt");
        assert_eq!(loaded.tags, vec!["rust", "test"]);
        assert!(loaded.featured);
        Ok(())
    }

    #[test]
    fn test_list_prompts_filtered() -> Result<()> {
        let db = Database::in_memory()?;

        let prompts = vec![
            Prompt {
                id: "p1".to_string(),
                title: "Prompt 1".to_string(),
                content: "Content 1".to_string(),
                description: None,
                category: Some("cat1".to_string()),
                tags: vec!["tag1".to_string()],
                variables: vec![],
                featured: true,
                version: None,
                author: None,
                saved_at: None,
                is_local: false,
            },
            Prompt {
                id: "p2".to_string(),
                title: "Prompt 2".to_string(),
                content: "Content 2".to_string(),
                description: None,
                category: Some("cat2".to_string()),
                tags: vec!["tag1".to_string(), "tag2".to_string()],
                variables: vec![],
                featured: false,
                version: None,
                author: None,
                saved_at: None,
                is_local: false,
            },
        ];

        for p in &prompts {
            db.upsert_prompt(p)?;
        }

        // Filter by category
        let cat1 = db.list_prompts_filtered(Some("cat1"), None, false)?;
        assert_eq!(cat1.len(), 1);
        assert_eq!(cat1[0].id, "p1");

        // Filter by tag
        let tag2 = db.list_prompts_filtered(None, Some("tag2"), false)?;
        assert_eq!(tag2.len(), 1);
        assert_eq!(tag2[0].id, "p2");

        // Filter featured
        let featured = db.list_prompts_filtered(None, None, true)?;
        assert_eq!(featured.len(), 1);
        assert_eq!(featured[0].id, "p1");
        Ok(())
    }

    #[test]
    fn test_category_and_tag_counts() -> Result<()> {
        let db = Database::in_memory()?;

        let prompts = vec![
            Prompt::new("p1", "P1", "C1"),
            Prompt::new("p2", "P2", "C2"),
        ];

        let mut p1 = prompts[0].clone();
        p1.category = Some("cat1".to_string());
        p1.tags = vec!["tag1".to_string(), "tag2".to_string()];

        let mut p2 = prompts[1].clone();
        p2.category = Some("cat1".to_string());
        p2.tags = vec!["tag1".to_string()];

        db.upsert_prompt(&p1)?;
        db.upsert_prompt(&p2)?;

        let cats = db.category_counts()?;
        assert_eq!(cats.len(), 1);
        assert_eq!(cats[0], ("cat1".to_string(), 2));

        let tags = db.tag_counts()?;
        assert_eq!(tags.len(), 2);
        // tag1 should have count 2, tag2 should have count 1
        assert!(tags.iter().any(|(t, c)| t == "tag1" && *c == 2));
        assert!(tags.iter().any(|(t, c)| t == "tag2" && *c == 1));
        Ok(())
    }
}
