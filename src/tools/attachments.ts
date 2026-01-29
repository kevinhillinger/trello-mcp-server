import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { formatValidationError } from '../utils/validation.js';

const validateGetAttachmentsOnCard = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    cardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid card ID format'),
    fields: z.array(z.string()).optional()
  });

  return schema.parse(args);
};

const validateGetAttachmentOnCard = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    cardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid card ID format'),
    attachmentId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid attachment ID format')
  });

  return schema.parse(args);
};

const validateDownloadFileAttachment = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    resourceUri: z.string().regex(/^trello:\/\//, 'Resource URI must start with trello://'),
    filePath: z.string().min(1, 'File path is required')
  });

  return schema.parse(args);
};

const getAttachmentsOnCard: ExecutableTool = {
  tool: {
    name: 'getAttachmentsOnCard',
    description: 'Get all attachments (files, links) for a specific Trello card. For file attachments (isUpload=true), the url property contains a trello:// resource URI that can be used immediately with the downloadFileAttachment tool to download the file to a local path.',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
        },
        token: {
          type: 'string',
          description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
        },
        cardId: {
          type: 'string',
          description: 'ID of the card to get attachments for',
          pattern: '^[a-f0-9]{24}$'
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: specific fields to include (e.g., ["name", "url", "mimeType", "date"])'
        }
      },
      required: ['apiKey', 'token', 'cardId']
    }
  },
  callback: async function getAttachmentsOnCardCallback(args: unknown) {
    try {
      const { apiKey, token, cardId, fields } = validateGetAttachmentsOnCard(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getCardAttachments(cardId, {
        ...(fields && { fields })
      });
      const attachments = response.data;

      // Process attachments - set resource URIs for file attachments
      const processedAttachments = attachments.map((attachment: any) => {
        let url = attachment.url;
        
        // For file attachments, return a resource URI instead of downloading
        if (attachment.isUpload) {
          const encodedFileName = encodeURIComponent(attachment.name || `attachment_${attachment.id}`);
          url = `trello://cards/${cardId}/attachments/${attachment.id}/download/${encodedFileName}`;
        }

        return {
          id: attachment.id,
          name: attachment.name,
          url: url,
          mimeType: attachment.mimeType,
          date: attachment.date,
          bytes: attachment.bytes,
          isUpload: attachment.isUpload,
          previews: attachment.previews?.map((preview: any) => ({
            id: preview.id,
            width: preview.width,
            height: preview.height,
            url: preview.url
          })) || []
        };
      });

      const result = {
        summary: `Found ${attachments.length} attachment(s) for card`,
        cardId,
        attachments: processedAttachments,
        rateLimit: response.rateLimit
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof z.ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error getting card attachments: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getAttachmentOnCard: ExecutableTool = {
  tool: {
    name: 'getAttachmentOnCard',
    description: 'Get a specific attachment from a Trello card. If the attachment is a file (isUpload=true), the url property contains a trello:// resource URI that can be used with the downloadFileAttachment tool to download the file to a local path.',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
        },
        token: {
          type: 'string',
          description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
        },
        cardId: {
          type: 'string',
          description: 'ID of the card containing the attachment',
          pattern: '^[a-f0-9]{24}$'
        },
        attachmentId: {
          type: 'string',
          description: 'ID of the attachment to retrieve',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['apiKey', 'token', 'cardId', 'attachmentId']
    }
  },
  callback: async function getAttachmentOnCardCallback(args: unknown) {
    try {
      const { apiKey, token, cardId, attachmentId } = validateGetAttachmentOnCard(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getCardAttachment(cardId, attachmentId);
      const attachment = response.data;

      let finalUrl = attachment.url;

      // If it's an uploaded file, return a resource URI
      if (attachment.isUpload) {
        const encodedFileName = encodeURIComponent(attachment.name || `attachment_${attachment.id}`);
        finalUrl = `trello://cards/${cardId}/attachments/${attachmentId}/download/${encodedFileName}`;
      }

      const result = {
        id: attachment.id,
        name: attachment.name,
        url: finalUrl,
        mimeType: attachment.mimeType,
        date: attachment.date,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload,
        previews: attachment.previews?.map((preview: any) => ({
          id: preview.id,
          width: preview.width,
          height: preview.height,
          url: preview.url
        })) || [],
        rateLimit: response.rateLimit
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof z.ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error getting attachment: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const downloadFileAttachment: ExecutableTool = {
  tool: {
    name: 'downloadFileAttachment',
    description: 'Download a Trello card attachment file to a specified local path. Accepts a trello:// resource URI and downloads the file content to the given file path.',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
        },
        token: {
          type: 'string',
          description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
        },
        resourceUri: {
          type: 'string',
          description: 'The trello:// resource URI (e.g., trello://cards/{cardId}/attachments/{attachmentId}/download/{fileName})',
          pattern: '^trello://'
        },
        filePath: {
          type: 'string',
          description: 'Local file path where the attachment should be downloaded (e.g., ./downloads/document.pdf)'
        }
      },
      required: ['apiKey', 'token', 'resourceUri', 'filePath']
    }
  },
  callback: async function downloadFileAttachmentCallback(args: unknown) {
    try {
      const { apiKey, token, resourceUri, filePath } = validateDownloadFileAttachment(args);

      // Parse the trello:// URI to extract cardId, attachmentId, and fileName
      const match = resourceUri.match(
        /^trello:\/\/cards\/([^\/]+)\/attachments\/([^\/]+)\/download\/(.+)$/
      );

      if (!match) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid resource URI format: ${resourceUri}\nExpected format: trello://cards/{cardId}/attachments/{attachmentId}/download/{fileName}`
            }
          ],
          isError: true
        };
      }

      const [, cardId, attachmentId] = match;

      // Get attachment metadata from Trello API
      const client = new TrelloClient({ apiKey, token });
      const response = await client.getCardAttachment(cardId, attachmentId);
      const attachment = response.data;

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
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`
            }
          ],
          isError: true
        };
      }

      // Write file to the specified path
      const fs = await import('fs');
      const path = await import('path');
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      
      // Ensure directory exists
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      fs.writeFileSync(filePath, buffer);

      const result = {
        success: true,
        message: 'File downloaded successfully',
        filePath: filePath,
        fileName: attachment.name,
        fileSize: attachment.bytes,
        mimeType: attachment.mimeType || 'application/octet-stream',
        cardId,
        attachmentId
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof z.ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error downloading attachment: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const attachmentTools = new Map<string, ExecutableTool>();
attachmentTools.set(getAttachmentsOnCard.tool.name, getAttachmentsOnCard);
attachmentTools.set(getAttachmentOnCard.tool.name, getAttachmentOnCard);
attachmentTools.set(downloadFileAttachment.tool.name, downloadFileAttachment);
