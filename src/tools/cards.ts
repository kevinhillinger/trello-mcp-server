import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { client } from '../trello/client.js';
import {
  validateCreateCard,
  validateUpdateCard,
  validateMoveCard,
  validateGetCard,
  validateDeleteCard,
  validateAddAttachmentToCard,
  validateDeleteAttachmentFromCard,
  validateCreateChecklistOnCard,
  validateUpdateCheckItem,
  validateDeleteCheckItem,
  validateAddLabelToCard,
  validateRemoveLabelFromCard,
  validateAddMemberToCard,
  validateRemoveMemberFromCard,
  validateArchiveCard,
  formatValidationError
} from '../utils/validation.js';

const validateGetCardActions = (args: unknown) => {
  const schema = z.object({
    cardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid card ID format'),
    filter: z.string().optional(),
    limit: z.number().min(1).max(1000).optional()
  });

  return schema.parse(args);
};

const createCard: ExecutableTool = {
  definition: {
    name: 'createCard',
    description: 'Create a new card in a Trello list. Use this to add tasks, ideas, or items to your workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name/title of the card (what the task or item is about)'
        },
        desc: {
          type: 'string',
          description: 'Optional detailed description of the card'
        },
        idList: {
          type: 'string',
          description: 'ID of the list where the card will be created (you can get this from get_lists)',
          pattern: '^[a-f0-9]{24}$'
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position in the list: "top", "bottom", or specific number'
        },
        due: {
          type: 'string',
          format: 'date-time',
          description: 'Optional due date for the card (ISO 8601 format, e.g., "2024-12-31T23:59:59Z")'
        },
        idMembers: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-f0-9]{24}$'
          },
          description: 'Optional array of member IDs to assign to the card'
        },
        idLabels: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-f0-9]{24}$'
          },
          description: 'Optional array of label IDs to categorize the card'
        }
      },
      required: ['name', 'idList']
    }
  },
  callback: async (args: unknown) => {
    try {
      const cardData = validateCreateCard(args);

      const response = await client.createCard(cardData);
      const card = response.data;

      const result = {
        summary: `Created card: ${card.name}`,
        card: {
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
          position: card.pos,
          due: card.due,
          closed: card.closed,
          labels: card.labels?.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || [],
          members: card.members?.map(member => ({
            id: member.id,
            fullName: member.fullName,
            username: member.username
          })) || []
        },
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
            text: `Error creating card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateCard: ExecutableTool = {
  definition: {
    name: 'updateCard',
    description: 'Update properties of an existing Trello card. Use this to change card details like name, description, due date, or status.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to update (you can get this from board details or card searches)',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'New name/title for the card'
        },
        desc: {
          type: 'string',
          description: 'New description for the card'
        },
        closed: {
          type: 'boolean',
          description: 'Set to true to archive the card, false to unarchive'
        },
        due: {
          type: ['string', 'null'],
          format: 'date-time',
          description: 'Set due date (ISO 8601 format) or null to remove due date'
        },
        dueComplete: {
          type: 'boolean',
          description: 'Mark the due date as complete (true) or incomplete (false)'
        },
        idList: {
          type: 'string',
          description: 'Move card to a different list by providing the list ID',
          pattern: '^[a-f0-9]{24}$'
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Change position in the list: "top", "bottom", or specific number'
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const updateData = validateUpdateCard(args);
      const { cardId, ...updates } = updateData;

      const response = await client.updateCard(cardId, updates);
      const card = response.data;

      const result = {
        summary: `Updated card: ${card.name}`,
        card: {
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
          position: card.pos,
          due: card.due,
          dueComplete: card.dueComplete,
          closed: card.closed,
          labels: card.labels?.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || []
        },
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
            text: `Error updating card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const moveCard: ExecutableTool = {
  definition: {
    name: 'moveCard',
    description: 'Move a card to a different list. Use this to change a card\'s workflow status (e.g., from "To Do" to "In Progress").',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to move (you can get this from board details or card searches)',
          pattern: '^[a-f0-9]{24}$'
        },
        idList: {
          type: 'string',
          description: 'ID of the destination list (you can get this from get_lists)',
          pattern: '^[a-f0-9]{24}$'
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position in the destination list: "top", "bottom", or specific number'
        }
      },
      required: ['cardId', 'idList']
    }
  },
  callback: async (args: unknown) => {
    try {
      const moveData = validateMoveCard(args);
      const { cardId, ...moveParams } = moveData;

      const response = await client.moveCard(cardId, moveParams);
      const card = response.data;

      const result = {
        summary: `Moved card "${card.name}" to list ${card.idList}`,
        card: {
          id: card.id,
          name: card.name,
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
          position: card.pos
        },
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
            text: `Error moving card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getCard: ExecutableTool = {
  definition: {
    name: 'getCard',
    description: 'Get detailed information about a specific Trello card, including its content, status, members, and attachments.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to retrieve (you can get this from board details or searches)',
          pattern: '^[a-f0-9]{24}$'
        },
        includeDetails: {
          type: 'boolean',
          description: 'Include additional details like members, labels, checklists, and activity badges',
          default: false
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, includeDetails } = validateGetCard(args);

      const response = await client.getCard(cardId, includeDetails);
      const card = response.data;

      const result = {
        summary: `Card: ${card.name}`,
        card: {
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
          position: card.pos,
          due: card.due,
          dueComplete: card.dueComplete,
          closed: card.closed,
          lastActivity: card.dateLastActivity,
          ...(includeDetails && {
            labels: card.labels?.map(label => ({
              id: label.id,
              name: label.name,
              color: label.color
            })) || [],
            members: card.members?.map(member => ({
              id: member.id,
              fullName: member.fullName,
              username: member.username,
              initials: member.initials
            })) || [],
            checklists: card.checklists?.map(checklist => ({
              id: checklist.id,
              name: checklist.name,
              checkItems: checklist.checkItems?.map(item => ({
                id: item.id,
                name: item.name,
                state: item.state,
                due: item.due
              })) || []
            })) || [],
            badges: card.badges ? {
              votes: card.badges.votes,
              comments: card.badges.comments,
              attachments: card.badges.attachments,
              checkItems: card.badges.checkItems,
              checkItemsChecked: card.badges.checkItemsChecked,
              description: card.badges.description
            } : undefined
          })
        },
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
            text: `Error getting card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteCard: ExecutableTool = {
  definition: {
    name: 'deleteCard',
    description: 'Permanently delete a Trello card. This action cannot be undone. Use update_card with closed=true to archive instead.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to delete (you can get this from board details or searches)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId } = validateDeleteCard(args);

      const response = await client.deleteCard(cardId);

      const result = {
        summary: `Deleted card ${cardId}`,
        cardId,
        deleted: true,
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
            text: `Error deleting card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const archiveCard: ExecutableTool = {
  definition: {
    name: 'archiveCard',
    description: 'Archive or unarchive a Trello card. Archived cards are hidden from the board but can be restored.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to archive/unarchive',
          pattern: '^[a-f0-9]{24}$'
        },
        archive: {
          type: 'boolean',
          description: 'Set to true to archive the card, false to unarchive (restore)',
          default: true
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, archive } = validateArchiveCard(args);

      const response = await client.updateCard(cardId, { closed: archive });
      const card = response.data;

      const action = archive ? 'Archived' : 'Unarchived';
      const result = {
        summary: `${action} card: ${card.name}`,
        card: {
          id: card.id,
          name: card.name,
          url: card.shortUrl,
          closed: card.closed
        },
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
            text: `Error archiving card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const addAttachmentToCard: ExecutableTool = {
  definition: {
    name: 'addAttachmentToCard',
    description: 'Add an attachment to a Trello card. Can attach either a URL or upload a file. Use this to link external resources, documents, or upload files directly.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to add attachment to',
          pattern: '^[a-f0-9]{24}$'
        },
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL to attach to the card (optional if file is provided)'
        },
        file: {
          type: 'string',
          description: 'Fully qualified path to a local file to upload as attachment (optional if url is provided). Example: "/Users/username/Documents/file.pdf" or "/home/user/document.md"'
        },
        name: {
          type: 'string',
          description: 'Display name for the attachment (required if file is provided, optional if url is provided)'
        },
        mimeType: {
          type: 'string',
          description: 'MIME type of the file (e.g., "text/markdown", "image/png"). Defaults to "text/markdown" for file uploads.'
        },
        setCover: {
          type: 'boolean',
          description: 'Set this attachment as the card cover image (only for images)',
          default: false
        }
      },
      required: ['cardId'],
      oneOf: [
        { required: ['url'] },
        { required: ['file', 'name'] }
      ]
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, url, file, name, mimeType, setCover } = validateAddAttachmentToCard(args);

      // Build attachment data
      const attachmentData: any = {};
      
      if (url) {
        // URL attachment - file is ignored if url is set
        attachmentData.url = url;
        if (name) attachmentData.name = name;
      } else if (file) {
        // File upload - read from local file path
        const fs = await import('fs');
        
        // Validate file exists
        if (!fs.existsSync(file)) {
          throw new Error(`File not found: ${file}`);
        }
        
        // Read file and convert to base64
        const fileBuffer = fs.readFileSync(file);
        const base64File = fileBuffer.toString('base64');
        
        // Convert base64 to binary string for JSON body
        const binaryString = Buffer.from(base64File, 'base64').toString('binary');
        
        attachmentData.file = binaryString;
        attachmentData.name = name; // Required for file uploads
        attachmentData.mimeType = mimeType || 'text/markdown';
      }
      
      if (setCover !== undefined) {
        attachmentData.setCover = setCover;
      }

      const response = await client.addAttachmentToCard(cardId, attachmentData);
      const attachment = response.data;

      const result = {
        summary: `Added ${file ? 'file' : 'URL'} attachment to card`,
        attachment: {
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          date: attachment.date,
          isUpload: attachment.isUpload,
          mimeType: attachment.mimeType
        },
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
            text: `Error adding attachment: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteAttachmentFromCard: ExecutableTool = {
  definition: {
    name: 'deleteAttachmentFromCard',
    description: 'Remove an attachment from a Trello card.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card containing the attachment',
          pattern: '^[a-f0-9]{24}$'
        },
        attachmentId: {
          type: 'string',
          description: 'ID of the attachment to delete (get from trello_get_card_attachments)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'attachmentId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, attachmentId } = validateDeleteAttachmentFromCard(args);

      const response = await client.deleteAttachmentFromCard(cardId, attachmentId);

      const result = {
        summary: `Deleted attachment ${attachmentId} from card`,
        cardId,
        attachmentId,
        deleted: true,
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
            text: `Error deleting attachment: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const createChecklistOnCard: ExecutableTool = {
  definition: {
    name: 'createChecklistOnCard',
    description: 'Create a new checklist on a Trello card. Checklists help track subtasks and progress.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to add the checklist to',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'Name of the checklist (e.g., "Tasks", "Requirements")'
        },
        idChecklistSource: {
          type: 'string',
          description: 'Optional: ID of an existing checklist to copy items from',
          pattern: '^[a-f0-9]{24}$'
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position of the checklist: "top", "bottom", or specific number'
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, name, idChecklistSource, pos } = validateCreateChecklistOnCard(args);

      const response = await client.createChecklistOnCard(cardId, {
        ...(name && { name }),
        ...(idChecklistSource && { idChecklistSource }),
        ...(pos !== undefined && { pos })
      });
      const checklist = response.data;

      const result = {
        summary: `Created checklist: ${checklist.name}`,
        checklist: {
          id: checklist.id,
          name: checklist.name,
          cardId: checklist.idCard,
          boardId: checklist.idBoard,
          position: checklist.pos,
          checkItems: checklist.checkItems || []
        },
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
            text: `Error creating checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateCheckItem: ExecutableTool = {
  definition: {
    name: 'updateCheckItem',
    description: 'Update a checklist item on a Trello card. Use this to mark items complete/incomplete or rename them.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card containing the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        checkItemId: {
          type: 'string',
          description: 'ID of the check item to update (get from trello_get_card_checklists)',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'New name for the check item'
        },
        state: {
          type: 'string',
          enum: ['complete', 'incomplete'],
          description: 'Set the check item state: "complete" to check it, "incomplete" to uncheck'
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position of the check item in the checklist'
        }
      },
      required: ['cardId', 'checkItemId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, checkItemId, name, state, pos } = validateUpdateCheckItem(args);

      const response = await client.updateCheckItem(cardId, checkItemId, {
        ...(name && { name }),
        ...(state && { state }),
        ...(pos !== undefined && { pos })
      });
      const checkItem = response.data;

      const result = {
        summary: `Updated check item: ${checkItem.name}`,
        checkItem: {
          id: checkItem.id,
          name: checkItem.name,
          state: checkItem.state,
          position: checkItem.pos
        },
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
            text: `Error updating check item: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteCheckItem: ExecutableTool = {
  definition: {
    name: 'deleteCheckItem',
    description: 'Delete a checklist item from a Trello card.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card containing the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        checkItemId: {
          type: 'string',
          description: 'ID of the check item to delete (get from trello_get_card_checklists)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'checkItemId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, checkItemId } = validateDeleteCheckItem(args);

      const response = await client.deleteCheckItem(cardId, checkItemId);

      const result = {
        summary: `Deleted check item ${checkItemId}`,
        cardId,
        checkItemId,
        deleted: true,
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
            text: `Error deleting check item: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const addLabelToCard: ExecutableTool = {
  definition: {
    name: 'addLabelToCard',
    description: 'Add a label to a Trello card for categorization. Labels help organize cards by type, priority, or category.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to add the label to',
          pattern: '^[a-f0-9]{24}$'
        },
        labelId: {
          type: 'string',
          description: 'ID of the label to add (get from trello_get_board_labels)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'labelId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, labelId } = validateAddLabelToCard(args);

      const response = await client.addLabelToCard(cardId, labelId);

      const result = {
        summary: `Added label ${labelId} to card`,
        cardId,
        labelId,
        labels: response.data,
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
            text: `Error adding label to card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const removeLabelFromCard: ExecutableTool = {
  definition: {
    name: 'removeLabelFromCard',
    description: 'Remove a label from a Trello card.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to remove the label from',
          pattern: '^[a-f0-9]{24}$'
        },
        labelId: {
          type: 'string',
          description: 'ID of the label to remove',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'labelId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, labelId } = validateRemoveLabelFromCard(args);

      const response = await client.removeLabelFromCard(cardId, labelId);

      const result = {
        summary: `Removed label ${labelId} from card`,
        cardId,
        labelId,
        removed: true,
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
            text: `Error removing label from card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const addMemberToCard: ExecutableTool = {
  definition: {
    name: 'addMemberToCard',
    description: 'Assign a member to a Trello card. Use this to assign responsibility for a task.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to assign the member to',
          pattern: '^[a-f0-9]{24}$'
        },
        memberId: {
          type: 'string',
          description: 'ID of the member to assign (get from trello_get_board_members)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'memberId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, memberId } = validateAddMemberToCard(args);

      const response = await client.addMemberToCard(cardId, memberId);

      const result = {
        summary: `Added member ${memberId} to card`,
        cardId,
        memberId,
        members: response.data,
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
            text: `Error adding member to card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const removeMemberFromCard: ExecutableTool = {
  definition: {
    name: 'removeMemberFromCard',
    description: 'Remove a member from a Trello card.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to remove the member from',
          pattern: '^[a-f0-9]{24}$'
        },
        memberId: {
          type: 'string',
          description: 'ID of the member to remove',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['cardId', 'memberId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, memberId } = validateRemoveMemberFromCard(args);

      const response = await client.removeMemberFromCard(cardId, memberId);

      const result = {
        summary: `Removed member ${memberId} from card`,
        cardId,
        memberId,
        removed: true,
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
            text: `Error removing member from card: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getCardActions: ExecutableTool = {
  definition: {
    name: 'getCardActions',
    description: 'Get activity history and comments for a specific Trello card. Useful for tracking changes and discussions.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: {
          type: 'string',
          description: 'ID of the card to get actions for',
          pattern: '^[a-f0-9]{24}$'
        },
        filter: {
          type: 'string',
          enum: ['all', 'commentCard', 'updateCard', 'createCard'],
          description: 'Filter actions by type: "commentCard" for comments only, "updateCard" for updates',
          default: 'commentCard'
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          description: 'Maximum number of actions to return',
          default: 50
        }
      },
      required: ['cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { cardId, filter, limit } = validateGetCardActions(args);
      
      const response = await client.getCardActions(cardId, {
        ...(filter && { filter }),
        ...(limit !== undefined && { limit })
      });
      const actions = response.data;

      const result = {
        summary: `Found ${actions.length} action(s) for card`,
        cardId,
        actions: actions.map(action => ({
          id: action.id,
          type: action.type,
          date: action.date,
          memberCreator: action.memberCreator ? {
            id: action.memberCreator.id,
            fullName: action.memberCreator.fullName,
            username: action.memberCreator.username
          } : null,
          data: {
            text: action.data?.text,
            old: action.data?.old,
            card: action.data?.card ? {
              id: action.data.card.id,
              name: action.data.card.name
            } : null,
            list: action.data?.list ? {
              id: action.data.list.id,
              name: action.data.list.name
            } : null
          }
        })),
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
            text: `Error getting card actions: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const cardTools = new Map<string, ExecutableTool>();
cardTools.set(createCard.definition.name, createCard);
cardTools.set(updateCard.definition.name, updateCard);
cardTools.set(moveCard.definition.name, moveCard);
cardTools.set(getCard.definition.name, getCard);
cardTools.set(deleteCard.definition.name, deleteCard);
cardTools.set(archiveCard.definition.name, archiveCard);
cardTools.set(addAttachmentToCard.definition.name, addAttachmentToCard);
cardTools.set(deleteAttachmentFromCard.definition.name, deleteAttachmentFromCard);
cardTools.set(createChecklistOnCard.definition.name, createChecklistOnCard);
cardTools.set(updateCheckItem.definition.name, updateCheckItem);
cardTools.set(deleteCheckItem.definition.name, deleteCheckItem);
cardTools.set(addLabelToCard.definition.name, addLabelToCard);
cardTools.set(removeLabelFromCard.definition.name, removeLabelFromCard);
cardTools.set(addMemberToCard.definition.name, addMemberToCard);
cardTools.set(removeMemberFromCard.definition.name, removeMemberFromCard);
cardTools.set(getCardActions.definition.name, getCardActions);
