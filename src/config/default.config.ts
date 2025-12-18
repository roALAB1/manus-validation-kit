/**
 * @roALAB1/manus-validation-kit
 * Default Configuration
 */

import type {
  ValidationEngineConfig,
  CleanupConfig,
  OptimizationConfig,
} from '../types';

export const DEFAULT_VALIDATORS: ValidationEngineConfig = {
  validators: {
    zod_schema_validation: {
      name: 'Zod Schema Validation',
      weight: 0.99,
      command: 'node scripts/validate-schemas.js',
      timeout: 30000,
      required: true,
      enabled: true,
    },
    database_migration_check: {
      name: 'Database Migration Check',
      weight: 0.98,
      command: 'node scripts/validate-migrations.js',
      timeout: 60000,
      required: true,
      enabled: true,
    },
    typescript: {
      name: 'TypeScript Compiler',
      weight: 0.96,
      command: 'npx tsc --noEmit',
      timeout: 120000,
      required: true,
      enabled: true,
    },
    biome: {
      name: 'Biome Linter',
      weight: 0.94,
      command: 'npx biome check .',
      timeout: 60000,
      required: false,
      enabled: true,
    },
    jest_unit: {
      name: 'Jest Unit Tests',
      weight: 0.93,
      command: 'npx jest --coverage --passWithNoTests',
      timeout: 300000,
      required: true,
      enabled: true,
    },
    eslint: {
      name: 'ESLint',
      weight: 0.92,
      command: 'npx eslint . --format json --max-warnings 0',
      timeout: 120000,
      required: false,
      enabled: true,
    },
    api_contract_test: {
      name: 'API Contract Tests',
      weight: 0.91,
      command: "npx jest --testPathPattern='\\.contract\\.test\\.ts$' --passWithNoTests",
      timeout: 180000,
      required: false,
      enabled: true,
    },
    docker_build_check: {
      name: 'Docker Build Check',
      weight: 0.90,
      command: 'docker build --dry-run . 2>/dev/null || echo "Docker not available"',
      timeout: 300000,
      required: false,
      enabled: false,
    },
    security_scan: {
      name: 'Security Scan',
      weight: 0.88,
      command: 'npx audit-ci --moderate || npm audit --audit-level=moderate',
      timeout: 120000,
      required: false,
      enabled: true,
    },
    performance_check: {
      name: 'Performance Check',
      weight: 0.85,
      command: 'node scripts/performance-check.js',
      timeout: 180000,
      required: false,
      enabled: false,
    },
  },
  consensus: {
    minValidatorsToFlag: 2,
    singleValidatorThreshold: 0.95,
  },
  outputDir: '.validation',
  failOnError: true,
};

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  maxActiveSize: 512000, // 500KB
  maxFailureCount: 1000,
  maxPatternCount: 100,
  retentionDays: 30,
  archiveAfterDays: 7,
  compressAfterDays: 14,
  deleteAfterDays: 90,
};

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  codeAsApi: {
    enabled: true,
    batchSize: 10,
    timeout: 60000,
  },
  serenaContext: {
    enabled: false, // Requires Serena MCP setup
    maxContextSize: 50000,
    semanticThreshold: 0.7,
  },
  selfSpec: {
    enabled: true,
    strictMode: false,
  },
  sparseDebate: {
    enabled: true,
    initialValidators: ['typescript', 'zod_schema_validation', 'eslint'],
    escalationThreshold: 0.8,
  },
};

export const SEVERITY_WEIGHTS = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
  info: 0.1,
};

export const GROWTH_PHASES = [
  {
    phase: 1,
    name: 'MVP',
    userRange: [100, 1000] as [number, number],
    qpsRange: [10, 100] as [number, number],
    bottlenecks: [],
    changesNeeded: [],
    timeline: 'Month 1-2',
  },
  {
    phase: 2,
    name: 'Early Growth',
    userRange: [1000, 50000] as [number, number],
    qpsRange: [50, 500] as [number, number],
    bottlenecks: ['Database connections', 'Session management'],
    changesNeeded: ['Add Redis caching', 'Connection pooling'],
    timeline: 'Month 4-5',
  },
  {
    phase: 3,
    name: 'Scaling',
    userRange: [50000, 500000] as [number, number],
    qpsRange: [500, 1000] as [number, number],
    bottlenecks: ['Write throughput', 'Search performance'],
    changesNeeded: ['Database replication', 'Async processing', 'CDN'],
    timeline: 'Month 9-10',
  },
  {
    phase: 4,
    name: 'Production Scale',
    userRange: [500000, 10000000] as [number, number],
    qpsRange: [1000, 10000] as [number, number],
    bottlenecks: ['Multiple systems', 'Global latency'],
    changesNeeded: ['Sharding', 'Kafka/message queues', 'Kubernetes', 'Multi-region'],
    timeline: 'Month 15-17',
  },
];

export const COMMON_BLIND_SPOTS = [
  {
    title: 'Distributed Data Consistency',
    likelihood: 0.95,
    impact: 'high' as const,
    description: 'Data inconsistency across replicas during network partitions',
    prevention: 'Plan replication strategy from day 1, implement eventual consistency patterns',
  },
  {
    title: 'Cascading Service Failures',
    likelihood: 0.88,
    impact: 'critical' as const,
    description: 'One service failure brings down dependent services',
    prevention: 'Implement circuit breakers, bulkheads, and graceful degradation',
  },
  {
    title: 'Database Migration Hell',
    likelihood: 0.92,
    impact: 'high' as const,
    description: 'Schema changes become impossible without downtime',
    prevention: 'Build abstraction layer, use backward-compatible migrations',
  },
  {
    title: 'Cost Explosion',
    likelihood: 0.85,
    impact: 'high' as const,
    description: 'Cloud costs grow faster than revenue',
    prevention: 'Monitor cost per user, set alerts on 50% growth, optimize early',
  },
  {
    title: 'Operational Complexity',
    likelihood: 0.90,
    impact: 'high' as const,
    description: 'System becomes too complex for team to manage',
    prevention: 'Keep architecture simple, document all decisions, automate operations',
  },
];
