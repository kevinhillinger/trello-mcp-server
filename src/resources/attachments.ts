import * as path from 'path';
import * as fs from 'fs';
import { TrelloClient } from '../trello/client.js';
import { TrelloResourceType, type FileAttachmentResourceResult, UnsupportedResourceError } from '../types/mcp.js';
import {
  CACHE_TTL_MS,
  TEMP_DIR,
  ensureTempDir,
  getCachedFileAttachment,
  cacheFileAttachment,
  cleanupFileAttachment,
  isCacheValid,
  toFileUri,
  clearFileAttachmentCache
} from './cache.js';

/**
 * Regex pattern to parse trello:// attachment URIs.
 * Format: trello://cards/{cardId}/attachments/{attachmentId}/download/{fileName}
 */
const ATTACHMENT_URI_PATTERN = /^trello:\/\/cards\/([^\/]+)\/attachments\/([^\/]+)\/download\/(.+)$/;

/**
 * Parses a trello:// URI and extracts the resource type.
 * @param uri - The trello:// URI to parse
 * @returns The TrelloResourceType for the URI
 * @throws UnsupportedResourceError if the URI format is not recognized
 */
export function getResourceType(uri: string): TrelloResourceType {
  if (ATTACHMENT_URI_PATTERN.test(uri)) {
    return TrelloResourceType.fileAttachment;
  }

  throw new UnsupportedResourceError(uri);
}

/**
 * Parses a trello:// attachment URI and extracts the card ID, attachment ID, and file name.
 * @param uri - The trello:// URI to parse
 * @returns An object containing cardId, attachmentId, and fileName
 * @throws Error if the URI format is invalid
 */
function parseAttachmentUri(uri: string): { cardId: string; attachmentId: string; fileName: string } {
  const match = uri.match(ATTACHMENT_URI_PATTERN);

  if (!match) {
    throw new Error(
      `Invalid attachment resource URI format: ${uri}\n` +
      `Expected format: trello://cards/{cardId}/attachments/{attachmentId}/download/{fileName}`
    );
  }

  const [, cardId, attachmentId, fileName] = match;
  return { cardId, attachmentId, fileName: decodeURIComponent(fileName) };
}

/**
 * Lists available attachment resources.
 * Since attachments are dynamically discovered through card queries,
 * this returns an empty list. Clients should use getAttachmentsOnCard
 * to discover available attachment resources.
 * @returns An empty array (attachments are discovered dynamically)
 */
export function listAttachmentResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}> {
  // Attachments are dynamic resources discovered via getAttachmentsOnCard tool
  // Return empty list as MCP spec requires a valid response
  return [];
}

/**
 * Handles a request to read an attachment resource.
 * Downloads the attachment file from Trello to a temp directory and returns
 * a file:// URI with metadata. Files are cached for 10 minutes and then deleted.
 * @param uri - The trello:// URI of the attachment resource
 * @param apiKey - Trello API key for authentication
 * @param token - Trello API token for authentication
 * @returns FileAttachmentResourceResult with file URI and metadata
 */
export async function handleAttachmentResource(
  uri: string,
  apiKey: string,
  token: string
): Promise<FileAttachmentResourceResult> {
  const { cardId, attachmentId, fileName } = parseAttachmentUri(uri);

  // Check if we have a valid cached version that hasn't expired
  const cached = getCachedFileAttachment(attachmentId);

  if (cached) {
    if (isCacheValid(cached)) {
      // Return cached file info
      const fileUri = toFileUri(cached.filePath);
      const expiresAt = new Date(cached.downloadedAt + CACHE_TTL_MS).toISOString();
      const metadata = {
        filePath: cached.filePath,
        fileName: cached.fileName,
        fileSize: cached.fileSize,
        mimeType: cached.mimeType,
        cardId: cached.cardId,
        attachmentId: cached.attachmentId,
        cached: true,
        cachedAt: new Date(cached.downloadedAt).toISOString(),
        expiresAt,
        instructions: {
          action: 'read_file',
          description: `Read the file from the local filesystem at filePath. The file will be automatically deleted after ${expiresAt}.`,
          filePath: cached.filePath,
          expiresAt
        }
      };

      return {
        contents: [
          {
            uri: fileUri,
            mimeType: 'application/json',
            text: JSON.stringify(metadata, null, 2)
          }
        ]
      };
    }

    // Cache is expired or file is missing - clean up
    cleanupFileAttachment(attachmentId);
  }

  // Get attachment metadata from Trello API
  const client = new TrelloClient({ apiKey, token });
  const response = await client.getCardAttachment(cardId, attachmentId);
  const attachment = response.data;

  if (!attachment) {
    throw new Error(`Attachment ${attachmentId} not found on card ${cardId}`);
  }

  // Ensure temp directory exists
  ensureTempDir();

  // Create a safe filename
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(TEMP_DIR, `${attachmentId}_${safeFileName}`);

  // Download the file with OAuth 1.0 authentication
  const authHeader = `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`;

  const fileResponse = await fetch(attachment.url, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Accept': '*/*'
    }
  });

  if (!fileResponse.ok) {
    throw new Error(`Failed to download attachment: ${fileResponse.status} ${fileResponse.statusText}`);
  }

  // Write file to temp directory
  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Determine mime type and file size
  const mimeType = attachment.mimeType || 'application/octet-stream';
  const fileSize = attachment.bytes || buffer.length;
  const downloadedAt = Date.now();

  // Cache the attachment info
  cacheFileAttachment({
    filePath,
    fileName: attachment.name || fileName,
    fileSize,
    mimeType,
    cardId,
    attachmentId,
    downloadedAt
  });

  // Build response with file URI and metadata
  const fileUri = toFileUri(filePath);
  const expiresAt = new Date(downloadedAt + CACHE_TTL_MS).toISOString();
  const finalFileName = attachment.name || fileName;
  const metadata = {
    filePath,
    fileName: finalFileName,
    fileSize,
    mimeType,
    cardId,
    attachmentId,
    cached: false,
    cachedAt: new Date(downloadedAt).toISOString(),
    expiresAt,
    instructions: {
      action: 'read_file',
      description: `Read the file from the local filesystem at filePath. The file will be automatically deleted after ${expiresAt}.`,
      filePath,
      expiresAt
    }
  };

  return {
    contents: [
      {
        uri: fileUri,
        mimeType: 'application/json',
        text: JSON.stringify(metadata, null, 2)
      }
    ]
  };
}

// Re-export cache clear function for server shutdown
export { clearFileAttachmentCache };
