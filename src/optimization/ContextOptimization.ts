/**
 * @audiencelab/manus-validation-kit
 * Context Optimization Engine (Layer 4)
 * 
 * Manages context window efficiency through automatic cleanup,
 * archival, and compression of validation data.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import type {
  CleanupConfig,
  CleanupReport,
  ContextMetrics,
} from '../types';
import { DEFAULT_CLEANUP_CONFIG } from '../config/default.config';

const gzip = promisify(zlib.gzip);

export class ContextOptimization {
  private projectPath: string;
  private validationDir: string;
  private archiveDir: string;
  private config: CleanupConfig;

  constructor(projectPath: string, config?: Partial<CleanupConfig>) {
    this.projectPath = projectPath;
    this.validationDir = path.join(projectPath, '.validation');
    this.archiveDir = path.join(this.validationDir, 'archive');
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * Run full cleanup process
   */
  async cleanup(): Promise<CleanupReport> {
    console.log('\n🧹 Running Context Optimization...\n');

    const beforeMetrics = await this.getMetrics();

    let itemsRemoved = 0;
    let itemsArchived = 0;
    let itemsCompressed = 0;

    // Step 1: Remove old failures from learning data
    itemsRemoved += await this.pruneOldFailures();

    // Step 2: Remove low-confidence patterns
    itemsRemoved += await this.pruneLowConfidencePatterns();

    // Step 3: Archive old reports
    itemsArchived += await this.archiveOldReports();

    // Step 4: Compress old archives
    itemsCompressed += await this.compressOldArchives();

    // Step 5: Delete very old archives
    itemsRemoved += await this.deleteOldArchives();

    const afterMetrics = await this.getMetrics();

    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      beforeMetrics,
      afterMetrics,
      itemsRemoved,
      itemsArchived,
      itemsCompressed,
      spaceSaved: beforeMetrics.totalSize - afterMetrics.totalSize,
    };

    this.printReport(report);

    return report;
  }

  /**
   * Get current context metrics
   */
  async getMetrics(): Promise<ContextMetrics> {
    let totalSize = 0;
    let activeSize = 0;
    let archivedSize = 0;

    // Calculate active data size
    const activeFiles = ['learning-data.json', 'config.json'];
    for (const file of activeFiles) {
      const filePath = path.join(this.validationDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        activeSize += stats.size;
      }
    }

    // Calculate archived data size
    if (fs.existsSync(this.archiveDir)) {
      const archiveFiles = fs.readdirSync(this.archiveDir);
      for (const file of archiveFiles) {
        const filePath = path.join(this.archiveDir, file);
        const stats = fs.statSync(filePath);
        archivedSize += stats.size;
      }
    }

    totalSize = activeSize + archivedSize;

    // Estimate token count (rough approximation: 4 chars per token)
    const tokenEstimate = Math.round(totalSize / 4);

    // Calculate compression ratio
    const compressionRatio = archivedSize > 0 ? activeSize / (activeSize + archivedSize) : 1;

    return {
      totalSize,
      activeSize,
      archivedSize,
      compressionRatio,
      tokenEstimate,
    };
  }

  /**
   * Check if cleanup is needed
   */
  async shouldCleanup(): Promise<boolean> {
    const metrics = await this.getMetrics();

    return (
      metrics.activeSize > this.config.maxActiveSize ||
      metrics.tokenEstimate > 100000
    );
  }

  /**
   * Prune old failures from learning data
   */
  private async pruneOldFailures(): Promise<number> {
    const learningDataPath = path.join(this.validationDir, 'learning-data.json');
    
    if (!fs.existsSync(learningDataPath)) {
      return 0;
    }

    try {
      const data = JSON.parse(fs.readFileSync(learningDataPath, 'utf-8'));
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const originalCount = data.failures?.length || 0;
      
      // Keep recent failures and at least 100 for pattern detection
      data.failures = (data.failures || [])
        .filter((f: { timestamp: string }) => new Date(f.timestamp) > cutoffDate)
        .slice(-Math.max(100, this.config.maxFailureCount));

      const removedCount = originalCount - data.failures.length;

      if (removedCount > 0) {
        fs.writeFileSync(learningDataPath, JSON.stringify(data, null, 2));
        console.log(`  📦 Pruned ${removedCount} old failure records`);
      }

      return removedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Prune low-confidence patterns
   */
  private async pruneLowConfidencePatterns(): Promise<number> {
    const learningDataPath = path.join(this.validationDir, 'learning-data.json');
    
    if (!fs.existsSync(learningDataPath)) {
      return 0;
    }

    try {
      const data = JSON.parse(fs.readFileSync(learningDataPath, 'utf-8'));
      const originalCount = data.patterns?.length || 0;

      // Remove patterns with < 3 occurrences AND < 20% fix rate
      data.patterns = (data.patterns || []).filter(
        (p: { occurrences: number; fixRate: number }) =>
          p.occurrences >= 3 || p.fixRate >= 0.2
      );

      // Keep only top patterns
      data.patterns = data.patterns.slice(0, this.config.maxPatternCount);

      const removedCount = originalCount - data.patterns.length;

      if (removedCount > 0) {
        fs.writeFileSync(learningDataPath, JSON.stringify(data, null, 2));
        console.log(`  🗑️  Removed ${removedCount} low-confidence patterns`);
      }

      return removedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Archive old reports
   */
  private async archiveOldReports(): Promise<number> {
    const reportsDir = path.join(this.validationDir, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return 0;
    }

    // Ensure archive directory exists
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveAfterDays);

    let archivedCount = 0;
    const files = fs.readdirSync(reportsDir);

    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        const archivePath = path.join(this.archiveDir, file);
        fs.renameSync(filePath, archivePath);
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      console.log(`  📁 Archived ${archivedCount} old reports`);
    }

    return archivedCount;
  }

  /**
   * Compress old archives
   */
  private async compressOldArchives(): Promise<number> {
    if (!fs.existsSync(this.archiveDir)) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.compressAfterDays);

    let compressedCount = 0;
    const files = fs.readdirSync(this.archiveDir);

    for (const file of files) {
      if (file.endsWith('.gz')) continue; // Already compressed

      const filePath = path.join(this.archiveDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        try {
          const content = fs.readFileSync(filePath);
          const compressed = await gzip(content);
          fs.writeFileSync(`${filePath}.gz`, compressed);
          fs.unlinkSync(filePath);
          compressedCount++;
        } catch {
          // Ignore compression errors
        }
      }
    }

    if (compressedCount > 0) {
      console.log(`  🗜️  Compressed ${compressedCount} archive files`);
    }

    return compressedCount;
  }

  /**
   * Delete very old archives
   */
  private async deleteOldArchives(): Promise<number> {
    if (!fs.existsSync(this.archiveDir)) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.deleteAfterDays);

    let deletedCount = 0;
    const files = fs.readdirSync(this.archiveDir);

    for (const file of files) {
      const filePath = path.join(this.archiveDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`  🗑️  Deleted ${deletedCount} old archive files`);
    }

    return deletedCount;
  }

  /**
   * Print cleanup report
   */
  private printReport(report: CleanupReport): void {
    console.log('\n' + '═'.repeat(60));
    console.log('  CONTEXT OPTIMIZATION REPORT');
    console.log('═'.repeat(60));
    console.log(`  Space Saved: ${this.formatBytes(report.spaceSaved)}`);
    console.log('─'.repeat(60));
    console.log(`  Before: ${this.formatBytes(report.beforeMetrics.totalSize)} (${report.beforeMetrics.tokenEstimate.toLocaleString()} tokens)`);
    console.log(`  After:  ${this.formatBytes(report.afterMetrics.totalSize)} (${report.afterMetrics.tokenEstimate.toLocaleString()} tokens)`);
    console.log('─'.repeat(60));
    console.log(`  Items Removed:    ${report.itemsRemoved}`);
    console.log(`  Items Archived:   ${report.itemsArchived}`);
    console.log(`  Items Compressed: ${report.itemsCompressed}`);
    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export default ContextOptimization;
