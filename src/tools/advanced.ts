import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { formatValidationError } from '../utils/validation.js';

const validateGetCardChecklists = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    cardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid card ID format'),
    checkItems: z.string().optional(),
    fields: z.array(z.string()).optional()
  });

  return schema.parse(args);
};

const validateGetBoardMembers = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    boardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid board ID format')
  });

  return schema.parse(args);
};

const validateGetBoardLabels = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    boardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid board ID format')
  });

  return schema.parse(args);
};

const getCardChecklists: ExecutableTool = {
  definition: {
    name: 'getCardChecklists',
    description: 'Get all checklists and their items for a specific Trello card.',
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
          description: 'ID of the card to get checklists for',
          pattern: '^[a-f0-9]{24}$'
        },
        checkItems: {
          type: 'string',
          enum: ['all', 'none'],
          description: 'Include checklist items in response',
          default: 'all'
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: specific fields to include (e.g., ["name", "pos"])'
        }
      },
      required: ['apiKey', 'token', 'cardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, cardId, checkItems, fields } = validateGetCardChecklists(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getCardChecklists(cardId, {
        ...(checkItems && { checkItems }),
        ...(fields && { fields })
      });
      const checklists = response.data;

      const result = {
        summary: `Found ${checklists.length} checklist(s) for card`,
        cardId,
        checklists: checklists.map(checklist => ({
          id: checklist.id,
          name: checklist.name,
          position: checklist.pos,
          checkItems: checklist.checkItems?.map((item: any) => ({
            id: item.id,
            name: item.name,
            state: item.state,
            position: item.pos,
            due: item.due,
            nameData: item.nameData
          })) || []
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
            text: `Error getting card checklists: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardMembers: ExecutableTool = {
  definition: {
    name: 'getBoardMembers',
    description: 'Get all members who have access to a specific Trello board.',
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
        boardId: {
          type: 'string',
          description: 'ID of the board to get members for',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['apiKey', 'token', 'boardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, boardId } = validateGetBoardMembers(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getBoardMembers(boardId);
      const members = response.data;

      const result = {
        summary: `Found ${members.length} member(s) on board`,
        boardId,
        members: members.map(member => ({
          id: member.id,
          fullName: member.fullName,
          username: member.username,
          memberType: member.memberType,
          confirmed: member.confirmed,
          avatarUrl: member.avatarUrl,
          initials: member.initials
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
            text: `Error getting board members: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardLabels: ExecutableTool = {
  definition: {
    name: 'getBoardLabels',
    description: 'Get all labels available on a specific Trello board for categorizing cards.',
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
        boardId: {
          type: 'string',
          description: 'ID of the board to get labels for',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['apiKey', 'token', 'boardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, boardId } = validateGetBoardLabels(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getBoardLabels(boardId);
      const labels = response.data;

      const result = {
        summary: `Found ${labels.length} label(s) on board`,
        boardId,
        labels: labels.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color,
          uses: label.uses
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
            text: `Error getting board labels: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const advancedTools = new Map<string, ExecutableTool>();
advancedTools.set(getCardChecklists.definition.name, getCardChecklists);
advancedTools.set(getBoardMembers.definition.name, getBoardMembers);
advancedTools.set(getBoardLabels.definition.name, getBoardLabels);
