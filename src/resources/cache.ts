import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Cache TTL in milliseconds (10 minutes)
 */
export const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Temp directory for downloaded attachments
 */
export const TEMP_DIR = path.join(os.tmpdir(), 'trello-mcp-server');

/**
 * Cached file attachment info with file path and cleanup timer
 */
export interface CachedFileAttachment {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  cardId: string;
  attachmentId: string;
  downloadedAt: number;
  cleanupTimer: NodeJS.Timeout;
}

/**
 * In-memory cache for downloaded file attachments
 * Key: attachmentId
 */
const fileAttachmentCache = new Map<string, CachedFileAttachment>();

/**
 * Ensures the temp directory exists
 */
export function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Deletes a cached attachment file and removes from cache
 */
export function cleanupFileAttachment(attachmentId: string): void {
  const cached = fileAttachmentCache.get(attachmentId);
  if (cached) {
    // Clear the timer if it exists
    if (cached.cleanupTimer) {
      clearTimeout(cached.cleanupTimer);
    }

    // Delete the file if it exists
    if (fs.existsSync(cached.filePath)) {
      try {
        fs.unlinkSync(cached.filePath);
      } catch {
        // Ignore deletion errors
      }
    }

    // Remove from cache
    fileAttachmentCache.delete(attachmentId);
  }
}

/**
 * Gets a cached file attachment by attachment ID
 */
export function getCachedFileAttachment(attachmentId: string): CachedFileAttachment | undefined {
  return fileAttachmentCache.get(attachmentId);
}

/**
 * Stores a file attachment in the cache with automatic cleanup
 */
export function cacheFileAttachment(attachment: Omit<CachedFileAttachment, 'cleanupTimer'>): void {
  // Set up cleanup timer
  const cleanupTimer = setTimeout(
    () => cleanupFileAttachment(attachment.attachmentId),
    CACHE_TTL_MS
  );

  // Cache the attachment info
  fileAttachmentCache.set(attachment.attachmentId, {
    ...attachment,
    cleanupTimer
  });
}

/**
 * Checks if a cached attachment is valid (not expired and file exists)
 */
export function isCacheValid(cached: CachedFileAttachment): boolean {
  const now = Date.now();
  const isExpired = (now - cached.downloadedAt) >= CACHE_TTL_MS;
  const fileExists = fs.existsSync(cached.filePath);
  return !isExpired && fileExists;
}

/**
 * Converts a file path to a file:// URI
 */
export function toFileUri(filePath: string): string {
  // Normalize path separators and encode for URI
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Handle Windows paths (C:/...) vs Unix paths (/...)
  if (/^[a-zA-Z]:/.test(normalizedPath)) {
    return `file:///${normalizedPath}`;
  }
  return `file://${normalizedPath}`;
}

/**
 * Clears all cached attachments and deletes temp files.
 * Useful for cleanup on server shutdown.
 */
export function clearFileAttachmentCache(): void {
  for (const attachmentId of fileAttachmentCache.keys()) {
    cleanupFileAttachment(attachmentId);
  }
}
