/**
 * Backup Service - Automated SQLite backups using better-sqlite3's backup API
 *
 * IMPORTANT: Never use fs.copyFile() to backup SQLite - it causes corruption
 * if the database is being written to during the copy. The db.backup() API
 * handles this safely.
 */
import Database from 'better-sqlite3';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('backup');

// Database directory and backup configuration
const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const MAX_BACKUP_AGE_DAYS = 7;

// Ensure backup directory exists
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('Created backup directory', { path: BACKUP_DIR });
  }
}

/**
 * Get all SQLite database files in the data directory
 */
function getDatabaseFiles(): string[] {
  if (!fs.existsSync(DATA_DIR)) {
    logger.warn('Data directory not found', { path: DATA_DIR });
    return [];
  }

  const files = fs.readdirSync(DATA_DIR);
  return files
    .filter((file) => file.endsWith('.db'))
    .map((file) => path.join(DATA_DIR, file));
}

/**
 * Create a backup of a single SQLite database
 * Uses better-sqlite3's backup API which is safe during writes
 */
async function backupDatabase(dbPath: string): Promise<string | null> {
  const dbName = path.basename(dbPath);
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, `${dbName.replace('.db', '')}-${timestamp}.db`);

  try {
    // Check if source database exists
    if (!fs.existsSync(dbPath)) {
      logger.warn('Database file not found, skipping', { path: dbPath });
      return null;
    }

    const db = new Database(dbPath, { readonly: true });

    // Use SQLite's backup API - safe during concurrent writes
    await db.backup(backupPath);

    db.close();

    const stats = fs.statSync(backupPath);
    logger.info('Database backup created', {
      database: dbName,
      path: backupPath,
      sizeBytes: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2),
    });

    return backupPath;
  } catch (error: any) {
    logger.error('Database backup failed', {
      database: dbName,
      error: error.message,
      backupPath,
    });
    return null;
  }
}

/**
 * Create backups of all SQLite databases
 */
export async function createBackup(): Promise<string[]> {
  ensureBackupDir();

  const dbFiles = getDatabaseFiles();

  if (dbFiles.length === 0) {
    logger.warn('No database files found to backup');
    return [];
  }

  logger.info('Starting backup for all databases', { count: dbFiles.length });

  const results: string[] = [];

  for (const dbPath of dbFiles) {
    const backupPath = await backupDatabase(dbPath);
    if (backupPath) {
      results.push(backupPath);
    }
  }

  logger.info('Backup complete', {
    total: dbFiles.length,
    successful: results.length,
    failed: dbFiles.length - results.length,
  });

  // Clean up old backups after successful backup
  cleanOldBackups();

  return results;
}

/**
 * Remove backups older than MAX_BACKUP_AGE_DAYS
 */
function cleanOldBackups(): void {
  try {
    const maxAgeMs = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const files = fs.readdirSync(BACKUP_DIR);
    let cleaned = 0;

    for (const file of files) {
      if (!file.endsWith('.db')) continue;

      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const ageMs = now - stats.mtimeMs;

      if (ageMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        cleaned++;
        logger.info('Deleted old backup', {
          file,
          ageDays: Math.floor(ageMs / 86400000),
        });
      }
    }

    if (cleaned > 0) {
      logger.info('Backup cleanup complete', { filesRemoved: cleaned });
    }
  } catch (error: any) {
    logger.error('Failed to clean old backups', { error: error.message });
  }
}

/**
 * List existing backups with metadata
 */
export function listBackups(): { file: string; created: Date; sizeBytes: number }[] {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR);
  const backups: { file: string; created: Date; sizeBytes: number }[] = [];

  for (const file of files) {
    if (!file.endsWith('.db')) continue;

    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    backups.push({
      file,
      created: new Date(stats.mtimeMs),
      sizeBytes: stats.size,
    });
  }

  return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
}

/**
 * Start the backup scheduler
 * Runs every 6 hours (cron: '0 *​/6 * * *' - at minute 0 of hours 0, 6, 12, 18)
 */
export function startBackupScheduler(): void {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Starting scheduled backup');
    try {
      await createBackup();
    } catch (error: any) {
      logger.error('Scheduled backup failed', { error: error.message });
      // Note: alertService can be integrated here if critical alerts needed
    }
  });

  logger.info('Backup scheduler started', {
    schedule: 'every 6 hours',
    retention: `${MAX_BACKUP_AGE_DAYS} days`
  });

  // Run initial backup on startup (optional, helps verify setup)
  // Uncomment if you want a backup on every server restart:
  // createBackup().catch(err => logger.error('Initial backup failed', { error: err.message }));
}
