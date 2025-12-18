# Manus Validation Kit: Integration Guide

> How to call the validation engine from other apps and process the output.

This guide provides detailed instructions for integrating the `@roALAB1/manus-validation-kit` into your existing applications and CI/CD pipelines. It covers how to run automated validation and, most importantly, how to capture and use the resulting analysis reports.

## Core Concepts

The validation kit can be used in two primary ways:

1.  **CLI (Command Line Interface)**: Ideal for CI/CD pipelines, pre-commit hooks, and simple shell scripts. It outputs results to `stdout` and saves detailed JSON reports to disk.
2.  **Programmatic API**: Ideal for deeper integrations, custom tooling, and applications that need to programmatically react to validation results. It returns structured TypeScript objects.

### The Report Output

Regardless of how you run it, the validation engine produces a detailed JSON report. This report is your key to understanding the validation results. By default, all reports are saved to the `.validation/reports/` directory in your project.

**Key sections of the JSON report (`ValidationReport`):**

-   `status`: The overall status (`passed`, `failed`, `error`).
-   `score`: A numerical score from 0-100.
-   `summary`: A high-level overview (e.g., `totalIssues`, `criticalIssues`).
-   `results`: An array of results from each individual validator.
-   `consensusIssues`: A list of issues flagged by the consensus engine, which is often the most important part to check.

--- 

## Method 1: CLI Integration (Recommended for CI/CD)

This is the simplest way to automate validation. You run a command and check its exit code and/or parse the JSON output file.

### Step 1: Install the Kit

```bash
npm install @roALAB1/manus-validation-kit --save-dev
```

### Step 2: Initialize in Your Project

```bash
npx manus-validate init
```

### Step 3: Run Validation and Capture Output

You can run validation and get the report in a few ways.

#### Example: Shell Script for CI/CD

This script runs validation, checks the exit code for a simple pass/fail, and saves the JSON report path for later processing (e.g., uploading as an artifact).

```bash
#!/bin/bash

echo "🚀 Starting validation..."

# Define the reports directory
REPORTS_DIR=".validation/reports"

# Ensure the reports directory exists
mkdir -p $REPORTS_DIR

# Run validation and save the JSON output
# The CLI automatically saves a timestamped report to the directory.
# We can also pipe the JSON output directly if needed.
npx manus-validate validate --output=json > "$REPORTS_DIR/latest_report.json"

# Check the exit code for CI failure
VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
  echo "❌ Validation failed with exit code $VALIDATION_EXIT_CODE."
  # You can use a tool like `jq` to parse and display critical issues
  echo "📋 Critical Issues:"
  cat "$REPORTS_DIR/latest_report.json" | jq ".consensusIssues[] | select(.issue.severity == \"critical\")"
  exit 1
else
  echo "✅ Validation passed successfully."
  # Example: Get the validation score
  SCORE=$(cat "$REPORTS_DIR/latest_report.json" | jq ".score")
  echo "📊 Validation Score: $SCORE/100"
fi

# The latest report is now available at "$REPORTS_DIR/latest_report.json" for further processing.
echo "📄 Full report saved to $REPORTS_DIR/"

```

**To get the report:** The script above saves the full JSON report to `.validation/reports/latest_report.json`. Your CI/CD pipeline can then archive this file as an artifact, send it to a monitoring service, or use it to generate a summary.

--- 

## Method 2: Programmatic Integration (Recommended for Custom Tooling)

Use the programmatic API when you need to work with the validation results directly within a TypeScript/JavaScript application.

### Step 1: Install the Kit

```bash
npm install @roALAB1/manus-validation-kit --save-dev
```

### Step 2: Use the `validate` Function

The `validate` function is the main entry point for programmatic use. It returns a promise that resolves with the full report object.

#### Example: Node.js Script to Run Validation and Generate a Custom Summary

This script runs the validation and then processes the report object to create a custom summary.

```typescript
// file: ./scripts/run-custom-validation.ts
import { validate } from "@roALAB1/manus-validation-kit";
import type { ValidationReport, ConsensusIssue } from "@roALAB1/manus-validation-kit";
import * as fs from "fs";

async function runValidationAndGenerateSummary() {
  console.log("🚀 Starting programmatic validation...");

  const projectPath = process.cwd();

  try {
    // Run the full validation for all layers
    const results = await validate(projectPath, { layer: "all" });

    // The validation report is in the `validation` property
    const validationReport = results.validation;

    if (!validationReport) {
      console.error("❌ Validation report was not generated.");
      return;
    }

    console.log(`✅ Validation finished with status: ${validationReport.status}`);
    console.log(`📊 Score: ${validationReport.score}/100`);

    // **How to get the report output:**
    // The `validationReport` variable IS the report output.
    // You can now process it as needed.

    // Example: Generate a simple Markdown summary of critical issues
    const criticalIssues = validationReport.consensusIssues.filter(
      (ci) => ci.issue.severity === "critical"
    );

    let summaryMarkdown = `# Validation Summary\n\n`;
    summaryMarkdown += `**Overall Status**: ${validationReport.status}\n`;
    summaryMarkdown += `**Score**: ${validationReport.score}/100\n\n`;

    if (criticalIssues.length > 0) {
      summaryMarkdown += `## 🚨 ${criticalIssues.length} Critical Issues Found\n\n`;
      for (const issue of criticalIssues) {
        summaryMarkdown += `- **${issue.issue.code}**: ${issue.issue.message} (in ${issue.issue.file || "N/A"})\n`;
      }
    } else {
      summaryMarkdown += `## ✅ No Critical Issues Found\n`;
    }

    // Save the custom summary to a file
    fs.writeFileSync("validation-summary.md", summaryMarkdown);
    console.log("📄 Custom summary saved to validation-summary.md");

    // You can also access the skeptical reasoning report
    const skepticalReport = results.skeptical;
    if (skepticalReport) {
      console.log(`🤔 Skeptical Recommendation: ${skepticalReport.assessment.recommendation}`);
    }

  } catch (error) {
    console.error("An unexpected error occurred during validation:", error);
  }
}

runValidationAndGenerateSummary();

```

**To get the report:** In this example, the `validationReport` constant holds the entire report object. You have full, typed access to all its properties and can process it in any way you need.

## Summary of How to Get the Report

| Method | How to Get the Report |
|---|---|
| **CLI** | 1. **JSON File**: A timestamped JSON report is automatically saved in the `.validation/reports/` directory. <br> 2. **stdout**: Pipe the output of the `manus-validate` command to a file (e.g., `... > report.json`). |
| **Programmatic** | The `validate()` function returns a `Promise` that resolves to an object containing the full `ValidationReport` and `SkepticalReport`. You work with this object directly in your code. |

This integration guide provides the foundation for automating your quality assurance process. By capturing and analyzing these reports, you can create powerful workflows, custom dashboards, and intelligent alerting systems.
