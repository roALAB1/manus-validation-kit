# Quick Install Guide: Manus Validation Kit

This guide provides the simple, copy-paste-ready steps to install and configure the `@roALAB1/manus-validation-kit` in any new or existing repository.

---

### Step 1: Install the Validation Kit from GitHub

Run the following command in your project's root directory. This installs the kit directly from the GitHub repository.

```bash
npm install "@roALAB1/manus-validation-kit@github:roALAB1/manus-validation-kit" --save-dev
```

> **Note:** We use an alias to ensure the package name in `node_modules` is correct. If you are using `pnpm`, you can use `pnpm add @roALAB1/manus-validation-kit@github:roALAB1/manus-validation-kit --save-dev`.

---

### Step 2: Initialize the Configuration

This command creates the `.validation/` directory and adds the necessary validation scripts to your `package.json`.

```bash
npx manus-validate init
```

---

### Step 3: Add the GitHub Actions Workflow

Create a new file at `.github/workflows/validation.yml` and paste the following content. This will run the validation on every push and pull request.

```yaml
name: Manus Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    name: Run Validation
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm' # or 'pnpm' or 'yarn'

      - name: Install dependencies
        run: npm install # or 'pnpm install' or 'yarn install'

      - name: Run Manus Validation Engine
        run: npm run validate:all -- --ci

      - name: Upload Validation Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: validation-report
          path: .validation/reports/
          retention-days: 30
```

---

### Step 4: Commit the Changes

Commit the new and updated files to your repository.

```bash
git add package.json package-lock.json .github/workflows/validation.yml .validation/config.json
git commit -m "feat: Integrate Manus Validation Kit"
git push
```

**That's it!** Your repository is now set up for continuous validation.
