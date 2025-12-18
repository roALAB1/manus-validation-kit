# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-17

### Added

- **Layer 1: Code Validation Engine**
  - 10 validators with configurable weights
  - Consensus scoring (2+ validators or single > 0.95 weight)
  - JSON and text output formats
  - CI mode with exit codes

- **Layer 2: Skeptical Reasoning Engine**
  - Architectural critique system
  - Scalability phase analyzer (MVP → Production Scale)
  - Blind spot detector (5 common patterns)
  - Tech stack validator

- **Layer 3: Learning Loop**
  - Failure pattern detection
  - Auto-fix engine for high-confidence patterns
  - Learning metrics and recommendations
  - Pattern confidence scoring

- **Layer 4: Context Optimization**
  - Automatic cleanup triggers
  - Data archival and compression
  - Token usage estimation
  - Configurable retention policies

- **Layer 5: Optimization Stack** (Foundation)
  - Code as API (MCP) architecture
  - Serena context provider integration points
  - Self-Spec validation hooks
  - S²-MAD sparse debate framework

- **CLI**
  - `manus-validate validate` - Run code validation
  - `manus-validate learn` - Generate learning report
  - `manus-validate cleanup` - Run context optimization
  - `manus-validate init` - Initialize in project

- **Configuration**
  - `.validation/config.json` for project settings
  - Default validator weights and thresholds
  - Cleanup policy configuration

- **Documentation**
  - Comprehensive README
  - Type definitions for all interfaces
  - Usage examples

### Technical Details

- TypeScript 5.3+ with strict mode
- Node.js 18+ required
- Zero runtime dependencies (dev dependencies only)
- Full ESM and CommonJS support

---

## Future Roadmap

### [1.1.0] - Planned

- Serena MCP integration for semantic context retrieval
- Code as API execution batching
- Custom validator plugin system
- Dashboard UI for learning metrics

### [1.2.0] - Planned

- Self-Spec formal specification parser
- S²-MAD sparse debate implementation
- Multi-project learning aggregation
- Cloud sync for learning data

### [2.0.0] - Planned

- Full MCP server implementation
- Real-time validation streaming
- IDE extensions (VS Code, JetBrains)
- Enterprise features (SSO, audit logs)
