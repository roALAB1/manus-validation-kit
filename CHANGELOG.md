# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-20

### Added

- **Layer 7: SDK Guardrails** - Verified data structure enforcement to prevent AI hallucination
  - `SDKGuardrailsEngine` class for validating code against verified schemas
  - `templates/SDK_GUARDRAILS_TEMPLATE.md` for projects to define their verified schemas
  - `docs/SDK_GUARDRAILS_GUIDE.md` comprehensive documentation
  - Support for JSON and Markdown configuration formats
  - Field verification against documented schemas
  - Non-existent field detection (catches hallucinated fields)
  - Deprecated endpoint warnings
  - Confidence scoring for all violations

- **Type-Safe Implementation Protocol**
  - `docs/TYPE_SAFE_IMPLEMENTATION_PROTOCOL.md` - 4-phase pre-implementation workflow
  - Phase 1: Type Specification
  - Phase 2: Minimal Reproducible Example (MRE)
  - Phase 3: Integration Validation
  - Phase 4: Documentation Validation

- **PRD Template**
  - `templates/PRD_TEMPLATE.md` - Product Requirements Document with type-safe implementation section

- **Implementation Framework Guide**
  - `docs/IMPLEMENTATION_FRAMEWORK_GUIDE.md` - Shows how all validation documents work together

- **CLI Commands**
  - `manus-validate sdk` - Run SDK guardrails validation
  - `manus-validate sdk --init` - Generate SDK guardrails template
  - `manus-validate sdk --strict` - Strict mode (fail on any violation)

- **npm Scripts**
  - `validate:sdk` - Run SDK guardrails validation
  - `validate:sdk:init` - Generate SDK guardrails template

### Changed

- **Architecture**: Upgraded from a 6-layer to a 7-layer system
- **CLI**: Updated description and version to reflect 7-layer architecture
- **Init Command**: Now includes SDK guardrails configuration option
- **package.json**: Version bumped to 1.2.0

## [1.1.0] - 2025-12-19

### Added

- **Layer 6: Evidence-Based Codebase Audit**
  - `CodebaseAuditEngine` for full repo scanning
  - Tool wrappers for `depcheck`, `ts-prune`, `unimported`, `jscpd`, `madge`
  - `AuditReportGenerator` for console, JSON, and Markdown reports
  - Confidence scoring system (high/medium/low) to rate findings
  - `keep.json` exclusion list to prevent false positives
  - Cleanup script generation for high-confidence findings

- **CLI**
  - `manus-validate audit` - Run codebase audit
  - `manus-validate audit --type=<type>` - Run specific audit type
  - `manus-validate audit --generate-cleanup` - Generate cleanup script
  - `manus-validate audit --ci` - CI mode for audit

- **Documentation**
  - `docs/AUDIT_GUIDE.md` - Comprehensive guide for Layer 6
  - `docs/AUDIT_SYSTEM_DESIGN.md` - Architecture design document
  - Updated README with Layer 6 information

- **Version Control Artifacts**
  - `VERSIONING.md` - Semantic versioning policy
  - `scripts/bump-version.sh` - Automated version bumping script
  - `.github/workflows/release.yml` - Automated release workflow

### Changed

- **Architecture**: Upgraded from a 5-layer to a 6-layer system
- **package.json**: Version bumped to 1.1.0
- **CLI**: `init` command now creates `keep.json` and adds audit scripts

## [1.0.0] - 2025-12-17

### Added

- **Layer 1: Code Validation Engine**
  - 10 validators with configurable weights
  - Consensus scoring (2+ validators or single > 0.95 weight)

- **Layer 2: Skeptical Reasoning Engine**
  - Architectural critique and scalability analysis

- **Layer 3: Learning Loop**
  - Failure pattern detection and auto-fixing

- **Layer 4: Context Optimization**
  - Automatic cleanup, archival, and compression

- **Layer 5: Optimization Stack** (Foundation)
  - Code as API, Serena, Self-Spec, S²-MAD hooks

- **CLI**
  - `manus-validate validate`, `learn`, `cleanup`, `init`

- **Configuration**
  - `.validation/config.json` for project settings

---

## Future Roadmap

### [1.3.0] - Planned

- Serena MCP integration for semantic context retrieval
- Code as API execution batching
- Custom validator plugin system
- Dashboard UI for learning metrics

### [1.4.0] - Planned

- Self-Spec formal specification parser
- S²-MAD sparse debate implementation
- Multi-project learning aggregation
- Cloud sync for learning data

### [2.0.0] - Planned

- Full MCP server implementation
- Real-time validation streaming
- IDE extensions (VS Code, JetBrains)
- Enterprise features (SSO, audit logs)

---

[1.2.0]: https://github.com/roALAB1/manus-validation-kit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/roALAB1/manus-validation-kit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/roALAB1/manus-validation-kit/releases/tag/v1.0.0
