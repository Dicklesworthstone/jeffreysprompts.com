/**
 * Unit tests for packages/core/src/prompts/workflows.ts
 * Tests workflow data integrity, step validation, and lookup functions.
 * No mocks - imports real registry data and validates against it.
 */

import { describe, it, expect } from "bun:test";
import { workflows, getWorkflow } from "../../src/prompts/workflows";
import { prompts } from "../../src/prompts/registry";

// ---------------------------------------------------------------------------
// Workflow data integrity
// ---------------------------------------------------------------------------

describe("workflows array", () => {
  it("should have at least one workflow", () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = workflows.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have required fields on all workflows", () => {
    for (const workflow of workflows) {
      expect(workflow.id).toBeTruthy();
      expect(workflow.title).toBeTruthy();
      expect(workflow.description).toBeTruthy();
      expect(Array.isArray(workflow.steps)).toBe(true);
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(workflow.whenToUse)).toBe(true);
      expect(workflow.whenToUse.length).toBeGreaterThan(0);
    }
  });

  it("should have valid IDs (kebab-case)", () => {
    for (const workflow of workflows) {
      expect(workflow.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Workflow steps
// ---------------------------------------------------------------------------

describe("workflow steps", () => {
  it("should have unique step IDs within each workflow", () => {
    for (const workflow of workflows) {
      const stepIds = workflow.steps.map((s) => s.id);
      const uniqueStepIds = new Set(stepIds);
      expect(uniqueStepIds.size).toBe(stepIds.length);
    }
  });

  it("should have required fields on all steps", () => {
    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        expect(step.id).toBeTruthy();
        expect(step.promptId).toBeTruthy();
        expect(step.note).toBeTruthy();
      }
    }
  });

  it("should reference only existing prompt IDs", () => {
    const allPromptIds = new Set(prompts.map((p) => p.id));
    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        expect(allPromptIds.has(step.promptId)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getWorkflow
// ---------------------------------------------------------------------------

describe("getWorkflow", () => {
  it("should return workflow by ID", () => {
    const workflow = getWorkflow("new-feature");
    expect(workflow).toBeDefined();
    expect(workflow?.id).toBe("new-feature");
    expect(workflow?.title).toBe("New Feature Development");
  });

  it("should return undefined for non-existent ID", () => {
    const result = getWorkflow("nonexistent");
    expect(result).toBeUndefined();
  });

  it("should find every workflow by its ID", () => {
    for (const workflow of workflows) {
      const found = getWorkflow(workflow.id);
      expect(found).toBe(workflow);
    }
  });

  it("should return workflow with steps array", () => {
    for (const workflow of workflows) {
      const found = getWorkflow(workflow.id);
      expect(found?.steps).toEqual(workflow.steps);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-referencing with registry
// ---------------------------------------------------------------------------

describe("workflow-registry cross-references", () => {
  it("every workflow step prompt should exist in registry", () => {
    const allPromptIds = new Set(prompts.map((p) => p.id));
    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        if (!allPromptIds.has(step.promptId)) {
          throw new Error(
            `Workflow "${workflow.id}" step "${step.id}" references nonexistent prompt "${step.promptId}"`
          );
        }
      }
    }
  });
});
