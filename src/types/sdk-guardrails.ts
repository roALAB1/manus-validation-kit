/**
 * SDK Guardrails Types
 * Layer 7: Verified Data Structure Enforcement
 * 
 * @packageDocumentation
 * @module @roALAB1/manus-validation-kit
 */

/**
 * Confidence level for guardrail findings
 */
export type GuardrailConfidence = 'high' | 'medium' | 'low';

/**
 * Severity of a guardrail violation
 */
export type GuardrailSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Type of guardrail violation
 */
export type ViolationType = 
  | 'unverified_field'      // Field not in verified schema
  | 'wrong_type'            // Field exists but wrong type used
  | 'deprecated_field'      // Field is deprecated
  | 'missing_required'      // Required field not accessed
  | 'invalid_structure'     // JSONB/nested structure incorrect
  | 'hardcoded_value'       // Hardcoded value that should be dynamic
  | 'assumption'            // Code assumes something not verified
  | 'deprecated_endpoint';  // Using deprecated API endpoint

/**
 * A single verified field in a schema
 */
export interface VerifiedField {
  name: string;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  deprecated?: boolean;
  deprecatedReason?: string;
  example?: unknown;
}

/**
 * A verified table/entity schema
 */
export interface VerifiedSchema {
  name: string;
  description?: string;
  fields: VerifiedField[];
  primaryKey?: string;
  foreignKeys?: Array<{
    field: string;
    references: string;
  }>;
  jsonbFields?: Array<{
    field: string;
    structure: Record<string, unknown>;
  }>;
  nonExistentFields?: string[];  // Fields that DO NOT exist (common mistakes)
}

/**
 * A verified API endpoint
 */
export interface VerifiedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  deprecated?: boolean;
  deprecatedReason?: string;
  replacedBy?: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}

/**
 * Complete SDK guardrails configuration for a project
 */
export interface SDKGuardrailsConfig {
  version: string;
  projectName: string;
  lastUpdated: string;
  sourceFiles: Array<{
    path: string;
    purpose: string;
    lastVerified?: string;
  }>;
  schemas: VerifiedSchema[];
  endpoints?: VerifiedEndpoint[];
  commonMistakes?: Array<{
    mistake: string;
    correction: string;
    example?: string;
  }>;
  rules?: Array<{
    id: string;
    description: string;
    severity: GuardrailSeverity;
    pattern?: string;  // Regex pattern to detect
  }>;
}

/**
 * A single guardrail violation found in code
 */
export interface GuardrailViolation {
  id: string;
  type: ViolationType;
  severity: GuardrailSeverity;
  confidence: GuardrailConfidence;
  file: string;
  line: number;
  column?: number;
  code: string;
  message: string;
  suggestion?: string;
  evidence: string;  // Proof from verified schema
  schema?: string;   // Which schema was violated
  field?: string;    // Which field was involved
}

/**
 * Result of SDK guardrails validation
 */
export interface SDKGuardrailsResult {
  status: 'passed' | 'failed' | 'warning' | 'error';
  score: number;  // 0-100
  duration: number;  // milliseconds
  filesScanned: number;
  violationsFound: number;
  violations: GuardrailViolation[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    byType: Record<ViolationType, number>;
  };
  verifiedAgainst: {
    configFile: string;
    configVersion: string;
    schemasChecked: string[];
  };
}

/**
 * Options for running SDK guardrails validation
 */
export interface SDKGuardrailsOptions {
  configPath?: string;           // Path to guardrails config file
  targetPaths?: string[];        // Specific files/directories to scan
  excludePaths?: string[];       // Paths to exclude
  severityThreshold?: GuardrailSeverity;  // Minimum severity to report
  failOnWarning?: boolean;       // Fail if any warnings found
  strictMode?: boolean;          // Fail on any violation
  outputFormat?: 'json' | 'text' | 'markdown';
  verbose?: boolean;
}

/**
 * SDK Guardrails Engine interface
 */
export interface ISDKGuardrailsEngine {
  loadConfig(configPath: string): Promise<SDKGuardrailsConfig>;
  validate(projectPath: string, options?: SDKGuardrailsOptions): Promise<SDKGuardrailsResult>;
  generateReport(result: SDKGuardrailsResult, format: 'json' | 'text' | 'markdown'): string;
  createTemplate(projectName: string): SDKGuardrailsConfig;
}
