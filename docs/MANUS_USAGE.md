# Using the Validation Kit with Manus AI

This document provides specific instructions for integrating the `@audiencelab/manus-validation-kit` into your Manus AI workflows. By following this guide, you can ensure that every task in Manus that involves code changes is automatically validated for quality, architecture, and efficiency.

## The Goal

We want to establish a **continuous validation loop** where:

1.  You give Manus a task (e.g., "Add a new feature to my app").
2.  Manus clones your repo, makes the changes, and **automatically runs the validation kit**.
3.  If validation fails, Manus fixes the issues before committing.
4.  You receive code that is guaranteed to pass all quality checks.

## How to Set This Up

### Step 1: Add the Validation Kit to Your Repository

First, ensure your repository has the validation kit installed. If not, ask Manus to do it:

> "Clone my repository `roALAB1/my-app` and integrate the `@audiencelab/manus-validation-kit`. Initialize it and commit the changes."

This will add the kit as a dependency, create the `.validation/` config directory, and add the npm scripts.

### Step 2: Add Master Instructions to Your Manus Project

The key to making this work continuously is to add a **Master Instruction** to your Manus Project. This instruction will be inherited by every task you create in that project.

**Go to your Manus Project settings and add the following instruction:**

---

```
# MANDATORY: Validation Workflow

This project uses the Manus Validation Kit for quality assurance. You MUST follow this workflow for ALL code changes.

## Before Committing Any Code

1. Run the full validation suite:
   ```
   npm run validate:all
   ```

2. Check the validation status:
   - If PASSED: Proceed to commit.
   - If FAILED: Stop and fix all critical/high issues before committing.

3. The validation report is saved in `.validation/reports/`. Review it if needed.

## Reporting Requirements

When delivering results, always include:
- Final validation status (PASSED/FAILED)
- Validation score (0-100)
- Number of issues fixed (if any)

## Non-Negotiable Rules

- NEVER commit code that fails validation.
- ALWAYS run validation before pushing to GitHub.
- If validation fails repeatedly, inform the user and request guidance.
```

---

### Step 3: Start a New Task

Now, whenever you start a new task in this Manus Project, the agent will automatically follow the validation workflow. You don't need to repeat the instructions.

**Example task:**

> "Add a new API endpoint for user profiles. Make sure it follows our existing patterns."

Manus will:
1.  Clone the repo.
2.  Add the new endpoint.
3.  Run `npm run validate:all`.
4.  Fix any issues.
5.  Commit and push.
6.  Report the final validation status to you.

## Example Prompts for Common Scenarios

### Prompt: Initial Setup

> "Clone my repository `roALAB1/my-awesome-app` and set it up with the Manus Validation Kit. Initialize the validation config, add the GitHub Actions workflow, and commit the changes."

### Prompt: Feature Development with Validation

> "Add a new feature to handle payment processing. After implementing, run the full validation suite and fix any issues before committing."

### Prompt: Validation-Only Check

> "Clone my repository `roALAB1/my-awesome-app` and run the full validation suite. Give me a detailed report of any issues found, but do not make any changes."

### Prompt: Fix Validation Failures

> "The CI pipeline is failing on validation. Clone the repo, run `npm run validate:all`, analyze the report, and fix all critical and high severity issues."

## Advanced: Skeptical Reasoning for Architecture Reviews

For major changes or new projects, you can ask Manus to run the Skeptical Reasoning layer, which analyzes your architecture for scalability and potential blind spots.

> "Run a skeptical reasoning analysis on my repository. I want to know if the current architecture will scale to 100,000 users."

This will run:
```bash
npm run validate:architecture
```

And provide a report on architectural critiques, scalability phases, and blind spots.

## Troubleshooting

### "Validation kit not found"

The kit is not installed. Ask Manus:
> "Install the `@audiencelab/manus-validation-kit` package and run `npx manus-validate init`."

### "Validation keeps failing on the same issue"

Ask Manus to provide the full report:
> "Show me the contents of the latest validation report in `.validation/reports/`."

Then provide guidance on how to fix the specific issue.

### "I want to skip validation for this one task"

You can explicitly tell Manus to skip, but this is **not recommended**:
> "Make the changes and commit without running validation. I will handle QA manually."

---

By following this guide, you establish a robust, automated quality gate for all your development work within Manus. The validation kit becomes your always-on code reviewer, ensuring every change meets your quality standards before it ever reaches your main branch.
