// packages/core/src/prompts/registry.ts
// Single source of truth for all prompts

import type { Prompt, PromptCategory } from "./types";

// The prompts array - this IS the data (TypeScript-native, no markdown parsing)
export const prompts: Prompt[] = [
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    description: "Generate 30 improvement ideas, rigorously evaluate each, distill to the very best 5",
    category: "ideation",
    tags: ["brainstorming", "improvement", "evaluation", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 500,
    created: "2025-01-09",
    content: `Come up with your very best ideas for improving this project.

First generate a list of 30 ideas (brief one-liner for each).

Then go through each one systematically and critically evaluate it, rejecting the ones that are not excellent choices for good reasons and keeping the ones that pass your scrutiny.

Then, for each idea that passed your test, explain in detail exactly what the idea is (in the form of a concrete, specific, actionable plan with detailed code snippets where relevant), why it would be a good improvement, what are the possible downsides, and how confident you are that it actually improves the project (0-100%). Make sure to actually implement the top ideas now.

Use ultrathink.`,
    whenToUse: [
      "When starting a new feature or project",
      "When reviewing a codebase for improvements",
      "When stuck and need creative solutions",
      "At the start of a coding session for fresh perspective",
    ],
    tips: [
      "Run this at the start of a session for fresh perspective",
      "Combine with ultrathink for deeper analysis",
      "Focus on the top 3-5 ideas if time-constrained",
      "Let the agent implement ideas immediately after evaluation",
    ],
  },
  {
    id: "readme-reviser",
    title: "The README Reviser",
    description: "Update documentation for recent changes, framing them as how it always was",
    category: "documentation",
    tags: ["documentation", "readme", "docs", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "beginner",
    estimatedTokens: 300,
    created: "2025-01-09",
    content: `Update the README and other documentation to reflect all of the recent changes to the project.

Frame all updates as if they were always present (i.e., don't say "we added X" or "X is now Y" — just describe the current state).

Make sure to add any new commands, options, or features that have been added.

Use ultrathink.`,
    whenToUse: [
      "After completing a feature or significant code change",
      "When documentation is out of sync with code",
      "Before releasing a new version",
      "When onboarding new contributors",
    ],
    tips: [
      "Run after every significant feature completion",
      "Check for removed features that need to be undocumented",
      "Ensure examples still work with current code",
    ],
  },
  {
    id: "robot-mode-maker",
    title: "The Robot-Mode Maker",
    description: "Create an agent-optimized CLI interface for any project",
    category: "automation",
    tags: ["cli", "automation", "agent", "robot-mode", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 600,
    created: "2025-01-09",
    content: `Design and implement a "robot mode" CLI for this project.

The CLI should be optimized for use by AI coding agents:

1. **JSON Output**: Add --json flag to every command for machine-readable output
2. **Quick Start**: Running with no args shows help in ~100 tokens
3. **Structured Errors**: Error responses include code, message, suggestions
4. **TTY Detection**: Auto-switch to JSON when piped
5. **Exit Codes**: Meaningful codes (0=success, 1=not found, 2=invalid args, etc.)
6. **Token Efficient**: Dense, minimal output that respects context limits

Think about what information an AI agent would need and how to present it most efficiently.

Use ultrathink to design the interface before implementing.`,
    whenToUse: [
      "When building a new CLI tool",
      "When adding agent-friendly features to existing CLI",
      "When optimizing human-centric tools for AI use",
    ],
    tips: [
      "Start with the most common agent workflows",
      "Test output token counts to ensure efficiency",
      "Include fuzzy search for discoverability",
    ],
  },
  {
    id: "stripe-level-ui",
    title: "Stripe-Level UI",
    description: "Build world-class, polished UI/UX components with intense focus on visual appeal",
    category: "refactoring",
    tags: ["ui", "ux", "frontend", "design", "polish", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 200,
    created: "2025-08-31",
    content: `I want you to do a spectacular job building absolutely world-class UI/UX components, with an intense focus on making the most visually appealing, user-friendly, intuitive, slick, polished, "Stripe level" of quality UI/UX possible for this that leverages the good libraries that are already part of the project. Use ultrathink.`,
    whenToUse: [
      "When building new UI components",
      "When polishing existing interfaces",
      "When you want premium, professional-quality frontend",
    ],
    tips: [
      "Works great with Next.js, React, and Tailwind projects",
      "Reference Stripe's design system for inspiration",
      "Combine with existing component libraries like shadcn/ui",
    ],
  },
  {
    id: "git-committer",
    title: "The Git Committer",
    description: "Intelligently commit all changed files in logical groupings with detailed messages",
    category: "automation",
    tags: ["git", "commit", "automation", "workflow", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "beginner",
    estimatedTokens: 150,
    created: "2025-12-14",
    content: `Now, based on your knowledge of the project, commit all changed files now in a series of logically connected groupings with super detailed commit messages for each and then push. Take your time to do it right. Don't edit the code at all. Don't commit obviously ephemeral files. Use ultrathink.`,
    whenToUse: [
      "After completing a coding session with multiple changes",
      "When you have many modified files to commit",
      "When you want clean, well-organized git history",
    ],
    tips: [
      "Best used with a separate agent dedicated to git operations",
      "Agent will analyze diffs and group related changes",
      "Great for maintaining clean commit history",
    ],
  },
  {
    id: "de-slopify",
    title: "The De-Slopifier",
    description: "Remove telltale AI writing patterns from documentation and text",
    category: "documentation",
    tags: ["writing", "documentation", "editing", "style", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 350,
    created: "2026-01-03",
    content: `I want you to read through the complete text carefully and look for any telltale signs of "AI slop" style writing; one big tell is the use of em dash. You should try to replace this with a semicolon, a comma, or just recast the sentence accordingly so it sounds good while avoiding em dash.

Also, you want to avoid certain telltale writing tropes, like sentences of the form "It's not [just] XYZ, it's ABC" or "Here's why" or "Here's why it matters:". Basically, anything that sounds like the kind of thing an LLM would write disproportionately more commonly that a human writer and which sounds inauthentic/cringe.

And you can't do this sort of thing using regex or a script, you MUST manually read each line of the text and revise it manually in a systematic, methodical, diligent way. Use ultrathink.`,
    whenToUse: [
      "After generating documentation with AI",
      "When editing README files",
      "When polishing any AI-generated text for human readers",
    ],
    tips: [
      "Pay special attention to em dashes — they're a dead giveaway",
      "Watch for 'Here's why' and similar AI-isms",
      "Read the output aloud to catch unnatural phrasing",
    ],
  },
  {
    id: "code-reorganizer",
    title: "The Code Reorganizer",
    description: "Restructure scattered code files into a sensible, intuitive folder structure",
    category: "refactoring",
    tags: ["refactoring", "organization", "structure", "cleanup", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "advanced",
    estimatedTokens: 800,
    created: "2025-08-07",
    content: `We really have WAY too many code files scattered inside src/x with no rhyme or reason to the structure and location of code files; I feel like we could make things a lot more organized, logical, intuitive, etc. by reorganizing these into a nice, sensible folder structure, although I don't want something that has too many levels of nesting; basically, we should at least start out with making "no brainer" type changes to the folder structure, like putting all the "x" functionality-related code files into an "x" folder (and perhaps that inside of a data_sources folder which might also contain a "y" folder, etc.).

Before making any of these changes, I really need you to take the time to explore and read ALL of the many, many files in that folder and understand what they do, how they fit together, which code files import which others, how they interact in functional ways, etc., and then propose a reorganization plan in a new document called PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md so I can review it before doing anything; this plan should include not just your detailed reorganization plan but the super-detailed rationale and justification for your proposed file/folder structure and why you think it's optimal for aiding any developer or coding agent working on this project to immediately and intuitively understand the project structure and where to look for things, etc.

I'm also open to merging/consolidating/splitting individual code files; if we have multiple small related code files that you think should be combined into a single code file, explain why. If you think any particular code files are WAY too big and really should be refactored into several smaller code files, then explain that too and your proposed strategy for how to restructure them.

Always keep in mind, and track in this plan document, changes you will need to make to any calling code to properly reflect the new folder structure and file structure so that we don't break anything. I don't want to discover after you do all this that nothing works anymore and we have to do a massive slog to get anything running again properly. Use ultrathink.`,
    whenToUse: [
      "When your codebase has grown organically and become messy",
      "When onboarding new developers is difficult due to confusing structure",
      "When you can't find files intuitively",
    ],
    tips: [
      "Replace 'x' and 'y' with your actual folder/feature names",
      "Make sure no other agents are running when implementing the plan",
      "Always review the plan document before execution",
    ],
  },
  {
    id: "bug-hunter",
    title: "The Bug Hunter",
    description: "Explore codebase with fresh eyes to find and fix obvious bugs and issues",
    category: "debugging",
    tags: ["debugging", "bugs", "review", "fresh-eyes", "exploration"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 400,
    created: "2025-09-17",
    content: `I want you to sort of randomly explore the code files in this project, choosing code files to deeply investigate and understand and trace their functionality and execution flows through the related code files which they import or which they are imported by. Once you understand the purpose of the code in the larger context of the workflows, I want you to do a super careful, methodical, and critical check with "fresh eyes" to find any obvious bugs, problems, errors, issues, silly mistakes, etc. and then systematically and meticulously and intelligently correct them. Be sure to comply with ALL rules in the AGENTS md file and ensure that any code you write or revise conforms to the best practice guides referenced in the AGENTS md file.`,
    whenToUse: [
      "After writing a lot of new code",
      "When you suspect there might be bugs lurking",
      "As a general code quality check",
      "To keep agents productively busy exploring and improving code",
    ],
    tips: [
      "Great for keeping agents busy with useful work",
      "Follow up with 'OK, now fix ALL of them' for execution",
      "Works well after the agent has explored different parts of the codebase",
    ],
  },
  {
    id: "system-weaknesses",
    title: "System Weaknesses Analyzer",
    description: "Identify the weakest parts of the system that need fresh ideas and improvements",
    category: "ideation",
    tags: ["analysis", "improvement", "review", "brainstorming", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "intermediate",
    estimatedTokens: 100,
    created: "2025-09-17",
    content: `Based on everything you've seen, what are the weakest/worst parts of the system? What is most needing of fresh ideas and innovative/creative/clever improvements? Use ultrathink.`,
    whenToUse: [
      "After the agent has explored the codebase thoroughly",
      "When you want to identify areas for improvement",
      "As a starting point for refactoring discussions",
    ],
    tips: [
      "Best used after the agent has done substantial work in the session",
      "Follow up with prompts to actually implement the improvements",
      "Combine with a TODO list prompt for tracking execution",
    ],
  },
  {
    id: "hundred-to-ten-filter",
    title: "The 100-to-10 Filter",
    description: "Generate 100 ideas, then ruthlessly filter to the 10 most brilliant",
    category: "ideation",
    tags: ["brainstorming", "filtering", "innovation", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 400,
    created: "2025-09-17",
    content: `I want you to come up with your top 10 most brilliant ideas for adding extremely powerful and cool functionality that will make this system far more compelling, useful, intuitive, versatile, powerful, robust, reliable, etc. Use ultrathink. But be pragmatic and don't think of features that will be extremely hard to implement or which aren't necessarily worth the additional complexity burden they would introduce. But I don't want you to just think of 10 ideas: I want you to seriously think hard and come up with one HUNDRED ideas and then only tell me your 10 VERY BEST and most brilliant, clever, and radically innovative and powerful ideas.`,
    whenToUse: [
      "When you need truly exceptional ideas, not just good ones",
      "For major feature planning sessions",
      "When brainstorming product direction",
    ],
    tips: [
      "More rigorous than the Idea Wizard - use when quality matters most",
      "The 100→10 ratio forces deeper exploration of the solution space",
      "Great for finding non-obvious innovations",
    ],
  },
  {
    id: "multi-model-synthesis",
    title: "Multi-Model Synthesis",
    description: "Blend competing LLM outputs into a superior hybrid plan",
    category: "ideation",
    tags: ["planning", "synthesis", "multi-model", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 600,
    created: "2025-09-17",
    content: `I asked 3 competing LLMs to do the exact same thing and they came up with pretty different plans which you can read below. I want you to REALLY carefully analyze their plans with an open mind and be intellectually honest about what they did that's better than your plan. Then I want you to come up with the best possible revisions to your plan (you should simply update your existing document for your original plan with the revisions) that artfully and skillfully blends the "best of all worlds" to create a true, ultimate, superior hybrid version of the plan that best achieves our stated goals and will work the best in real-world practice to solve the problems we are facing and our overarching goals while ensuring the extreme success of the enterprise as best as possible; you should provide me with a complete series of git-diff style changes to your original plan to turn it into the new, enhanced, much longer and detailed plan that integrates the best of all the plans with every good idea included (you don't need to mention which ideas came from which models in the final revised enhanced plan).`,
    whenToUse: [
      "When you have outputs from multiple LLMs on the same task",
      "For important architectural decisions",
      "When you want the best possible plan regardless of source",
    ],
    tips: [
      "Works with Claude, GPT, Gemini, or any combination",
      "Requires intellectual honesty about other models' strengths",
      "Great for avoiding single-model blind spots",
    ],
  },
  {
    id: "premortem-planner",
    title: "The Premortem Planner",
    description: "Imagine failure 6 months out and revise the plan to prevent it",
    category: "ideation",
    tags: ["planning", "risk", "premortem", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 350,
    created: "2025-09-17",
    content: `Before we proceed, I want you to do a "premortem" on this plan. Imagine we're 6 months in the future and this approach has completely failed. What went wrong? What assumptions did we make that turned out to be false? What edge cases did we miss? What integration issues did we overlook? What would users hate about it? Now, with that pessimistic scenario fresh in your mind, revise the plan to address the most likely failure modes. Use ultrathink.`,
    whenToUse: [
      "Before committing to a major implementation",
      "When planning risky or complex features",
      "To challenge assumptions before they become problems",
    ],
    tips: [
      "Forces consideration of failure modes upfront",
      "Catches integration issues before they're expensive to fix",
      "Especially valuable for user-facing features",
    ],
  },
  {
    id: "deep-project-primer",
    title: "Deep Project Primer",
    description: "Essential first step to fully understand a project before any work",
    category: "workflow",
    tags: ["onboarding", "understanding", "exploration", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "beginner",
    estimatedTokens: 200,
    created: "2025-09-17",
    content: `First read ALL of the AGENTS.md file and README.md file super carefully and understand ALL of both! Then use your code investigation agent mode to fully understand the code, and technical architecture and purpose of the project. Use ultrathink.`,
    whenToUse: [
      "At the start of any new coding session",
      "When working on an unfamiliar project",
      "After context compaction to restore understanding",
      "Before any major architectural decisions",
    ],
    tips: [
      "Always use this before significant work",
      "Essential for maintaining project coherence",
      "Prevents agents from making uninformed changes",
    ],
  },
  {
    id: "stub-eliminator",
    title: "The Stub Eliminator",
    description: "Replace all stubs, placeholders, and mocks with production-ready code",
    category: "refactoring",
    tags: ["production", "quality", "completeness", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 150,
    created: "2025-09-17",
    content: `I need you to look for stubs, placeholders, mocks, of ANY KIND. These ALL must be replaced with FULLY FLESHED OUT, working, correct, performant, idiomatic code as per the beads. Use ultrathink to do this meticulously and carefully!`,
    whenToUse: [
      "Before shipping to production",
      "When auditing code quality",
      "After rapid prototyping phases",
      "To ensure feature completeness",
    ],
    tips: [
      "Critical for production readiness",
      "Mocks in production code are a major red flag",
      "Run this before any major release",
    ],
  },
  {
    id: "peer-code-reviewer",
    title: "Peer Code Reviewer",
    description: "Cross-agent code review to catch issues from parallel work",
    category: "debugging",
    tags: ["review", "quality", "cross-agent", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "intermediate",
    estimatedTokens: 250,
    created: "2025-09-17",
    content: `Ok can you now turn your attention to reviewing the code written by your fellow agents and checking for any issues, bugs, errors, problems, inefficiencies, security problems, reliability issues, etc. and carefully diagnose their underlying root causes using first-principle analysis and then fix or revise them if necessary? Don't restrict yourself to the latest commits, cast a wider net and go super deep! Use ultrathink.`,
    whenToUse: [
      "After multiple agents have been working on a project",
      "Before merging parallel work streams",
      "For quality assurance in multi-agent workflows",
    ],
    tips: [
      "Different from Bug Hunter - focuses on other agents' work",
      "Catches integration issues from parallel development",
      "Essential for multi-agent coordination",
    ],
  },
  {
    id: "e2e-pipeline-validator",
    title: "E2E Pipeline Validator",
    description: "Prove the entire system works with real data, no mocks allowed",
    category: "testing",
    tags: ["testing", "e2e", "validation", "no-mocks", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 350,
    created: "2025-09-17",
    content: `We really need to have totally complete, totally comprehensive, granular, perfect end to end testing coverage without ANY mocks or fake data, fake api calls, etc., that prove that our entire pipeline from start to finish works perfectly in a provable, ultra rigorous way. That means the raw data coming in from the various API services for EVERYTHING (not just one or two fields) for a bunch of test cases. Basically, the WHOLE thing, from "soup to nuts". Use ultrathink.`,
    whenToUse: [
      "Before production releases",
      "When building critical data pipelines",
      "To prove system correctness rigorously",
    ],
    tips: [
      "No mocks means real confidence in the system",
      "Cover the entire pipeline, not just individual units",
      "Essential for data-critical applications",
    ],
  },
  {
    id: "agent-swarm-launcher",
    title: "Agent Swarm Launcher",
    description: "Initialize multiple agents with full context and coordination protocols",
    category: "automation",
    tags: ["multi-agent", "coordination", "swarm", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 500,
    created: "2025-09-17",
    content: `First read ALL of the AGENTS.md file and README.md file super carefully and understand ALL of both! Then use your code investigation agent mode to fully understand the code, and technical architecture and purpose of the project. Then register with MCP Agent Mail and introduce yourself to the other agents. Be sure to check your agent mail and to promptly respond if needed to any messages; then proceed meticulously with your next assigned beads, working on the tasks systematically and meticulously and tracking your progress via beads and agent mail messages. Don't get stuck in "communication purgatory" where nothing is getting done; be proactive about starting tasks that need to be done, but inform your fellow agents via messages when you do so and mark beads appropriately. When you're not sure what to do next, use the bv tool mentioned in AGENTS.md to prioritize the best beads to work on next; pick the next one that you can usefully work on and get started. Make sure to acknowledge all communication requests from other agents and that you are aware of all active agents and their names. Use ultrathink.`,
    whenToUse: [
      "When launching multiple agents on a project",
      "For coordinated multi-agent workflows",
      "When using beads task management with agent mail",
    ],
    tips: [
      "Requires Agent Mail MCP server to be running",
      "Works with beads (bd) for task management",
      "Prevents agents from duplicating work",
    ],
  },
  {
    id: "deep-performance-audit",
    title: "Deep Performance Audit",
    description: "Systematic identification of optimization opportunities with proof requirements",
    category: "refactoring",
    tags: ["performance", "optimization", "profiling", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 1200,
    created: "2025-09-17",
    content: `First read ALL of the AGENTS.md file and README.md file super carefully and understand ALL of both! Then use your code investigation agent mode to fully understand the code, and technical architecture and purpose of the project. Then, once you've done an extremely thorough and meticulous job at all that and deeply understood the entire existing system and what it does, its purpose, and how it is implemented and how all the pieces connect with each other, I need you to hyper-intensively investigate and study and ruminate on these questions as they pertain to this project: are there any other gross inefficiencies in the core system? places in the codebase where 1) changes would actually move the needle in terms of overall latency/responsiveness and throughput; 2) such that our changes would be provably isomorphic in terms of functionality so that we would know for sure that it wouldn't change the resulting outputs given the same inputs; 3) where you have a clear vision to an obviously better approach in terms of algorithms or data structures.

Consider these optimization patterns:
- N+1 query/fetch pattern elimination
- zero-copy / buffer reuse / scatter-gather I/O
- serialization format costs (parse/encode overhead)
- bounded queues + backpressure
- sharding / striped locks to reduce contention
- memoization with cache invalidation strategies
- dynamic programming techniques
- lazy evaluation / deferred computation
- streaming/chunked processing for memory-bounded work
- pre-computation and lookup tables
- index-based lookup vs linear scan recognition
- binary search (on data and on answer space)
- two-pointer and sliding window techniques
- prefix sums / cumulative aggregates

METHODOLOGY REQUIREMENTS:
A) Baseline first: Run the test suite and a representative workload; record p50/p95/p99 latency, throughput, and peak memory with exact commands.
B) Profile before proposing: Capture CPU + allocation + I/O profiles; identify the top 3-5 hotspots by % time before suggesting changes.
C) Equivalence oracle: Define explicit golden outputs + invariants.
D) Isomorphism proof per change: Every proposed diff must include a short proof sketch explaining why outputs cannot change.
E) Opportunity matrix: Rank candidates by (Impact x Confidence) / Effort before implementing.
F) Minimal diffs: One performance lever per change. No unrelated refactors.
G) Regression guardrails: Add benchmark thresholds or monitoring hooks.

Use ultrathink.`,
    whenToUse: [
      "When performance is critical",
      "Before scaling to production load",
      "When profiling reveals hotspots",
    ],
    tips: [
      "Always profile before optimizing",
      "Require proof of isomorphism for each change",
      "One optimization per change for clear attribution",
    ],
  },
  {
    id: "cli-error-tolerance",
    title: "CLI Error Tolerance",
    description: "Make CLI tools forgiving of minor syntax issues for agent ergonomics",
    category: "automation",
    tags: ["cli", "agent-friendly", "error-handling", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "intermediate",
    estimatedTokens: 450,
    created: "2025-09-17",
    content: `One thing that's critical for the robot mode flags in the CLI (the mode intended for use by AI coding agents like yourself) is that we want to make it easy for the agents to use the tool; so first off, we want to make the CLI interface and system as intuitive and easy as possible and explain it super clearly in the CLI help and in a blurb in AGENTS.md. But beyond that, we want to be maximally flexible when the intent of a command is clear but there's some minor syntax issue; basically we'd like to honor all commands where the intent is legible (although in those cases we might want to precede the response with some note instructing the agent how to more correctly issue that command in the future). If we can't really figure out reliably what the agent is trying to do, then we should always return a super detailed and helpful/useful error message that lets the agent understand what it did wrong so it can do it the right way next time; we should give them a couple relevant correct examples in the error message about how to do what we might reasonably guess they are trying (and failing) to do with their wrong command. Use ultrathink.`,
    whenToUse: [
      "When building CLIs that agents will use",
      "To improve agent-tool interaction success rates",
      "After Robot-Mode Maker to enhance the interface",
    ],
    tips: [
      "Complements Robot-Mode Maker",
      "Reduces agent frustration with strict syntax",
      "Include teaching notes in error responses",
    ],
  },
  {
    id: "project-opinion-elicitor",
    title: "Project Opinion Elicitor",
    description: "Get honest, critical assessment of the project from the agent's perspective",
    category: "ideation",
    tags: ["feedback", "assessment", "honesty", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "beginner",
    estimatedTokens: 150,
    created: "2025-09-17",
    content: `Now tell me what you actually THINK of the project-- is it even a good idea? Is it useful? Is it well designed and architected? Pragmatic? What could we do to make it more useful and compelling and intuitive/user-friendly to both humans AND to AI coding agents? Use ultrathink.`,
    whenToUse: [
      "After the agent has explored the codebase",
      "When seeking honest feedback on direction",
      "For reality checks on project value",
    ],
    tips: [
      "Agents often have valuable outside perspective",
      "Encourages intellectual honesty",
      "Great for catching blind spots",
    ],
  },
  {
    id: "deployment-verifier",
    title: "Deployment Verifier",
    description: "Verify live deployment works with automated browser testing",
    category: "testing",
    tags: ["deployment", "verification", "playwright", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "intermediate",
    estimatedTokens: 250,
    created: "2025-09-17",
    content: `Deploy to vercel and verify that the deployment worked properly without any errors (iterate and fix if there were errors). Then visit the live site with playwright as both desktop and mobile browser and take screenshots and check for js errors and look at the screenshots for potential problems and iterate and fix them all super carefully! Use ultrathink.`,
    whenToUse: [
      "After deploying to production",
      "For automated deployment verification",
      "To catch runtime issues that static analysis misses",
    ],
    tips: [
      "Test both desktop and mobile viewports",
      "Check browser console for JS errors",
      "Screenshots help catch visual regressions",
    ],
  },
];

// Computed exports - derived from prompts array
export const categories = [...new Set(prompts.map((p) => p.category))].sort() as PromptCategory[];

export const tags = (() => {
  const tagCounts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    // Sort by count descending, then alphabetically for stable ordering
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
})();

export const featuredPrompts = prompts.filter((p) => p.featured);

export const promptsById = new Map(prompts.map((p) => [p.id, p]));

// Helper functions
export function getPrompt(id: string): Prompt | undefined {
  return promptsById.get(id);
}

export function getPromptsByCategory(category: PromptCategory): Prompt[] {
  return prompts.filter((p) => p.category === category);
}

export function getPromptsByTag(tag: string): Prompt[] {
  return prompts.filter((p) => p.tags.includes(tag));
}

/**
 * Simple text search across prompt fields
 * Searches id, title, description, tags, and content
 * @deprecated Use `searchPrompts` from `@jeffreysprompts/core/search` for better results (BM25 + semantic)
 */
export function searchPromptsByText(query: string): Prompt[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  return prompts.filter((p) => {
    const searchable = [
      p.id,
      p.title,
      p.description,
      ...p.tags,
      p.content,
    ].join(" ").toLowerCase();
    return searchable.includes(lowerQuery);
  });
}
