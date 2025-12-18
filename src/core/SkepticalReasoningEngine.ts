/**
 * @roALAB1/manus-validation-kit
 * Skeptical Reasoning Engine (Layer 2)
 * 
 * Analyzes architecture for scalability issues, blind spots, and tech stack conflicts.
 * Asks the hard questions: "Will this work at 10x scale?"
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  SkepticalReport,
  SkepticalAssessment,
  ArchitectureCritique,
  GrowthPhase,
  BlindSpot,
  TechStackIssue,
  SkepticalSeverity,
} from '../types';
import { GROWTH_PHASES, COMMON_BLIND_SPOTS } from '../config/default.config';

interface ProjectAnalysis {
  hasDatabase: boolean;
  databaseType?: string;
  hasCache: boolean;
  cacheType?: string;
  hasMessageQueue: boolean;
  queueType?: string;
  hasDocker: boolean;
  hasKubernetes: boolean;
  hasLoadBalancer: boolean;
  estimatedQPS: number;
  estimatedUsers: number;
  dependencies: string[];
  hasRateLimiting: boolean;
  hasCircuitBreaker: boolean;
  hasAsyncProcessing: boolean;
}

export class SkepticalReasoningEngine {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Run full skeptical analysis
   */
  async analyze(): Promise<SkepticalReport> {
    console.log('\n🤔 Running Skeptical Reasoning Analysis...\n');

    const analysis = await this.analyzeProject();
    
    const critiques = this.generateCritiques(analysis);
    const growthPhases = this.projectGrowthPhases(analysis);
    const blindSpots = this.detectBlindSpots(analysis);
    const techStackIssues = this.validateTechStack(analysis);
    const assessment = this.generateAssessment(critiques, blindSpots, techStackIssues);

    const report: SkepticalReport = {
      timestamp: new Date().toISOString(),
      assessment,
      critiques,
      growthPhases,
      blindSpots,
      techStackIssues,
    };

    this.printReport(report);

    return report;
  }

  /**
   * Analyze project structure and configuration
   */
  private async analyzeProject(): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      hasDatabase: false,
      hasCache: false,
      hasMessageQueue: false,
      hasDocker: false,
      hasKubernetes: false,
      hasLoadBalancer: false,
      estimatedQPS: 100,
      estimatedUsers: 1000,
      dependencies: [],
      hasRateLimiting: false,
      hasCircuitBreaker: false,
      hasAsyncProcessing: false,
    };

    // Check package.json for dependencies
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        analysis.dependencies = Object.keys(allDeps);

        // Detect database
        if (allDeps['pg'] || allDeps['postgres'] || allDeps['@prisma/client']) {
          analysis.hasDatabase = true;
          analysis.databaseType = 'PostgreSQL';
        } else if (allDeps['mysql'] || allDeps['mysql2']) {
          analysis.hasDatabase = true;
          analysis.databaseType = 'MySQL';
        } else if (allDeps['mongodb'] || allDeps['mongoose']) {
          analysis.hasDatabase = true;
          analysis.databaseType = 'MongoDB';
        }

        // Detect cache
        if (allDeps['redis'] || allDeps['ioredis']) {
          analysis.hasCache = true;
          analysis.cacheType = 'Redis';
        }

        // Detect message queue
        if (allDeps['amqplib'] || allDeps['rabbitmq']) {
          analysis.hasMessageQueue = true;
          analysis.queueType = 'RabbitMQ';
        } else if (allDeps['kafkajs'] || allDeps['kafka-node']) {
          analysis.hasMessageQueue = true;
          analysis.queueType = 'Kafka';
        } else if (allDeps['bullmq'] || allDeps['bull']) {
          analysis.hasMessageQueue = true;
          analysis.queueType = 'Bull (Redis)';
        }

        // Detect patterns
        analysis.hasRateLimiting = !!(allDeps['express-rate-limit'] || allDeps['rate-limiter-flexible']);
        analysis.hasCircuitBreaker = !!(allDeps['opossum'] || allDeps['cockatiel']);
        analysis.hasAsyncProcessing = !!(allDeps['bullmq'] || allDeps['bull'] || allDeps['agenda']);
      } catch {
        // Ignore parse errors
      }
    }

    // Check for Docker
    analysis.hasDocker = fs.existsSync(path.join(this.projectPath, 'Dockerfile')) ||
                         fs.existsSync(path.join(this.projectPath, 'docker-compose.yml'));

    // Check for Kubernetes
    analysis.hasKubernetes = fs.existsSync(path.join(this.projectPath, 'k8s')) ||
                             fs.existsSync(path.join(this.projectPath, 'kubernetes'));

    return analysis;
  }

  /**
   * Generate architectural critiques
   */
  private generateCritiques(analysis: ProjectAnalysis): ArchitectureCritique[] {
    const critiques: ArchitectureCritique[] = [];

    // No caching critique
    if (!analysis.hasCache && analysis.estimatedQPS > 100) {
      critiques.push({
        severity: 'critical',
        title: 'No Caching Layer Detected',
        concern: `No cache detected but architecture suggests ${analysis.estimatedQPS}+ QPS potential`,
        breaksAt: { qps: 500 },
        recommendation: 'Add Redis caching with appropriate TTL for frequently accessed data',
        rationale: 'Caching reduces database load by 80-90% for read-heavy workloads',
      });
    }

    // No rate limiting
    if (!analysis.hasRateLimiting) {
      critiques.push({
        severity: 'warning',
        title: 'No Rate Limiting Detected',
        concern: 'APIs are vulnerable to abuse and DDoS without rate limiting',
        breaksAt: { qps: 1000 },
        recommendation: 'Implement rate limiting at API gateway or application level',
        rationale: 'Rate limiting protects against abuse and ensures fair resource distribution',
      });
    }

    // No circuit breaker
    if (!analysis.hasCircuitBreaker && analysis.dependencies.length > 10) {
      critiques.push({
        severity: 'warning',
        title: 'No Circuit Breaker Pattern',
        concern: 'External service failures can cascade through the system',
        breaksAt: { connections: 100 },
        recommendation: 'Implement circuit breakers for all external service calls',
        rationale: 'Circuit breakers prevent cascading failures and improve resilience',
      });
    }

    // No async processing for heavy workloads
    if (!analysis.hasAsyncProcessing && !analysis.hasMessageQueue) {
      critiques.push({
        severity: 'suggestion',
        title: 'No Async Processing Detected',
        concern: 'Long-running tasks may block API responses',
        breaksAt: { users: 10000 },
        recommendation: 'Add Bull/BullMQ for background job processing',
        rationale: 'Async processing keeps APIs responsive under load',
      });
    }

    // MongoDB without sharding plan
    if (analysis.databaseType === 'MongoDB') {
      critiques.push({
        severity: 'warning',
        title: 'MongoDB Scalability Planning',
        concern: 'MongoDB requires sharding strategy for large datasets',
        breaksAt: { dataSize: '100GB', users: 100000 },
        recommendation: 'Plan sharding key and strategy before hitting 100GB',
        rationale: 'Retroactive sharding is extremely difficult and risky',
      });
    }

    // No containerization
    if (!analysis.hasDocker) {
      critiques.push({
        severity: 'suggestion',
        title: 'No Containerization',
        concern: 'Deployment consistency and scaling will be challenging',
        breaksAt: { users: 50000 },
        recommendation: 'Add Dockerfile for consistent deployments',
        rationale: 'Containers ensure consistent environments and enable horizontal scaling',
      });
    }

    return critiques;
  }

  /**
   * Project growth phases based on current architecture
   */
  private projectGrowthPhases(analysis: ProjectAnalysis): GrowthPhase[] {
    const phases = [...GROWTH_PHASES];

    // Adjust phases based on analysis
    if (!analysis.hasCache) {
      phases[1]!.bottlenecks.push('No caching - database overload');
      phases[1]!.changesNeeded.push('Add Redis caching immediately');
    }

    if (!analysis.hasMessageQueue) {
      phases[2]!.bottlenecks.push('Synchronous processing bottleneck');
      phases[2]!.changesNeeded.push('Add message queue for async tasks');
    }

    if (!analysis.hasKubernetes) {
      phases[3]!.bottlenecks.push('Manual scaling limitations');
      phases[3]!.changesNeeded.push('Migrate to Kubernetes for auto-scaling');
    }

    return phases;
  }

  /**
   * Detect blind spots in the architecture
   */
  private detectBlindSpots(analysis: ProjectAnalysis): BlindSpot[] {
    const blindSpots: BlindSpot[] = [...COMMON_BLIND_SPOTS];

    // Add project-specific blind spots
    if (analysis.databaseType === 'MongoDB' && !analysis.hasCache) {
      blindSpots.push({
        title: 'MongoDB Read Amplification',
        likelihood: 0.85,
        impact: 'high',
        description: 'Without caching, MongoDB will face read amplification at scale',
        prevention: 'Implement read-through caching pattern with Redis',
      });
    }

    if (!analysis.hasCircuitBreaker && analysis.dependencies.length > 15) {
      blindSpots.push({
        title: 'Dependency Chain Failure',
        likelihood: 0.90,
        impact: 'critical',
        description: 'Many dependencies increase risk of cascading failures',
        prevention: 'Implement circuit breakers and fallback strategies',
      });
    }

    return blindSpots;
  }

  /**
   * Validate tech stack compatibility
   */
  private validateTechStack(analysis: ProjectAnalysis): TechStackIssue[] {
    const issues: TechStackIssue[] = [];

    // Check for common incompatibilities
    if (analysis.databaseType === 'MongoDB' && analysis.cacheType === 'Redis') {
      // This is actually fine, just noting it
    }

    if (!analysis.hasDatabase && analysis.dependencies.length > 5) {
      issues.push({
        component: 'Database',
        issue: 'No database detected for a non-trivial application',
        severity: 'warning',
        recommendation: 'Ensure data persistence strategy is intentional',
      });
    }

    if (analysis.hasKubernetes && !analysis.hasDocker) {
      issues.push({
        component: 'Deployment',
        issue: 'Kubernetes config found but no Dockerfile',
        severity: 'critical',
        recommendation: 'Add Dockerfile to enable Kubernetes deployment',
      });
    }

    return issues;
  }

  /**
   * Generate overall assessment
   */
  private generateAssessment(
    critiques: ArchitectureCritique[],
    blindSpots: BlindSpot[],
    techStackIssues: TechStackIssue[]
  ): SkepticalAssessment {
    const criticalCount = critiques.filter(c => c.severity === 'critical').length +
                          techStackIssues.filter(t => t.severity === 'critical').length;
    const warningCount = critiques.filter(c => c.severity === 'warning').length +
                         techStackIssues.filter(t => t.severity === 'warning').length;
    const highImpactBlindSpots = blindSpots.filter(b => b.impact === 'critical' || b.impact === 'high').length;

    // Calculate scores
    const readinessScore = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    const scalabilityScore = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 15));
    const architectureScore = Math.max(0, 100 - (highImpactBlindSpots * 10) - (techStackIssues.length * 5));

    // Determine recommendation
    let recommendation: SkepticalAssessment['recommendation'];
    if (criticalCount > 0) {
      recommendation = 'stop-and-fix';
    } else if (warningCount > 2 || highImpactBlindSpots > 3) {
      recommendation = 'proceed-with-caution';
    } else {
      recommendation = 'proceed';
    }

    return {
      readinessScore,
      scalabilityScore,
      architectureScore,
      recommendation,
    };
  }

  /**
   * Print report to console
   */
  private printReport(report: SkepticalReport): void {
    const { assessment } = report;

    console.log('\n' + '═'.repeat(60));
    console.log('  SKEPTICAL REASONING REPORT');
    console.log('═'.repeat(60));
    
    const recIcon = assessment.recommendation === 'proceed' ? '✅' :
                    assessment.recommendation === 'proceed-with-caution' ? '⚠️' : '🛑';
    console.log(`  Recommendation: ${recIcon} ${assessment.recommendation.toUpperCase()}`);
    console.log('─'.repeat(60));
    console.log(`  Readiness Score:    ${assessment.readinessScore}/100`);
    console.log(`  Scalability Score:  ${assessment.scalabilityScore}/100`);
    console.log(`  Architecture Score: ${assessment.architectureScore}/100`);
    console.log('─'.repeat(60));
    console.log(`  Critiques:    ${report.critiques.length}`);
    console.log(`  Blind Spots:  ${report.blindSpots.length}`);
    console.log(`  Tech Issues:  ${report.techStackIssues.length}`);
    console.log('═'.repeat(60) + '\n');

    if (report.critiques.length > 0) {
      console.log('📋 Top Critiques:');
      for (const critique of report.critiques.slice(0, 3)) {
        const icon = critique.severity === 'critical' ? '🔴' :
                     critique.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} ${critique.title}`);
        console.log(`     → ${critique.recommendation}`);
      }
      console.log('');
    }
  }
}

export default SkepticalReasoningEngine;
