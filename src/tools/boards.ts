import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import {
  validateListBoards,
  validateGetBoard,
  validateGetBoardLists,
  formatValidationError
} from '../utils/validation.js';

const validateGetBoardCards = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    boardId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid board ID format'),
    attachments: z.string().optional(),
    members: z.string().optional(),
    filter: z.string().optional()
  });

  return schema.parse(args);
};

const listBoards: ExecutableTool = {
  definition: {
    name: 'listBoards',
    description: 'List all Trello boards accessible to the user. Use this to see all boards you have access to, or filter by status.',
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
        filter: {
          type: 'string',
          enum: ['all', 'open', 'closed'],
          description: 'Filter boards by status: "open" for active boards, "closed" for archived boards, "all" for both',
          default: 'open'
        }
      },
      required: ['apiKey', 'token']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, filter } = validateListBoards(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getMyBoards(filter);
      const boards = response.data;

      const summary = `Found ${boards.length} ${filter} board(s)`;
      const boardList = boards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.desc || 'No description',
        url: board.shortUrl,
        lastActivity: board.dateLastActivity,
        closed: board.closed
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              summary,
              boards: boardList,
              rateLimit: response.rateLimit
            }, null, 2)
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
            text: `Error listing boards: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardDetails: ExecutableTool = {
  definition: {
    name: 'getBoardDetails',
    description: 'Get detailed information about a specific Trello board, including its lists and cards. Useful for understanding board structure and content.',
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
          description: 'The ID of the board to retrieve (you can get this from list_boards)',
          pattern: '^[a-f0-9]{24}$'
        },
        includeDetails: {
          type: 'boolean',
          description: 'Include lists and cards in the response for complete board overview',
          default: false
        }
      },
      required: ['apiKey', 'token', 'boardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, boardId, includeDetails } = validateGetBoard(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getBoard(boardId, includeDetails);
      const board = response.data;

      const result = {
        summary: `Board: ${board.name}`,
        board: {
          id: board.id,
          name: board.name,
          description: board.desc || 'No description',
          url: board.shortUrl,
          lastActivity: board.dateLastActivity,
          closed: board.closed,
          permissions: board.prefs?.permissionLevel || 'unknown',
          ...(includeDetails && {
            lists: board.lists?.map(list => ({
              id: list.id,
              name: list.name,
              position: list.pos,
              closed: list.closed
            })) || [],
            cards: board.cards?.map(card => ({
              id: card.id,
              name: card.name,
              description: card.desc,
              url: card.shortUrl,
              listId: card.idList,
              position: card.pos,
              due: card.due,
              closed: card.closed,
              labels: card.labels?.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color
              })) || []
            })) || []
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
            text: `Error getting board details: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardLists: ExecutableTool = {
  definition: {
    name: 'getBoardLists',
    description: 'Get all lists in a specific Trello board. Use this to see the workflow columns (like "To Do", "In Progress", "Done") in a board.',
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
          description: 'The ID of the board to get lists from (you can get this from list_boards)',
          pattern: '^[a-f0-9]{24}$'
        },
        filter: {
          type: 'string',
          enum: ['all', 'open', 'closed'],
          description: 'Filter lists by status: "open" for active lists, "closed" for archived lists, "all" for both',
          default: 'open'
        }
      },
      required: ['apiKey', 'token', 'boardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, boardId, filter } = validateGetBoardLists(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getBoardLists(boardId, filter);
      const lists = response.data;

      const result = {
        summary: `Found ${lists.length} ${filter} list(s) in board`,
        boardId,
        lists: lists.map(list => ({
          id: list.id,
          name: list.name,
          position: list.pos,
          closed: list.closed,
          subscribed: list.subscribed
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
            text: `Error getting lists: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardCards: ExecutableTool = {
  definition: {
    name: 'getBoardCards',
    description: 'Get all cards from a Trello board with optional filtering and detailed information like attachments and members.',
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
          description: 'ID of the board to get cards from (you can get this from list_boards)',
          pattern: '^[a-f0-9]{24}$'
        },
        attachments: {
          type: 'string',
          enum: ['cover', 'true', 'false'],
          description: 'Include attachment information: "cover" for cover images, "true" for all attachments',
          default: 'false'
        },
        members: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Include member information for each card',
          default: 'true'
        },
        filter: {
          type: 'string',
          enum: ['all', 'open', 'closed'],
          description: 'Filter cards by status',
          default: 'open'
        }
      },
      required: ['apiKey', 'token', 'boardId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { apiKey, token, boardId, attachments, members, filter } = validateGetBoardCards(args);
      const client = new TrelloClient({ apiKey, token });

      const response = await client.getBoardCards(boardId, {
        ...(attachments && { attachments }),
        ...(members && { members }),
        ...(filter && { filter })
      });
      const cards = response.data;

      const result = {
        summary: `Found ${cards.length} card(s) in board`,
        boardId,
        cards: cards.map(card => ({
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          position: card.pos,
          due: card.due,
          dueComplete: card.dueComplete,
          closed: card.closed,
          lastActivity: card.dateLastActivity,
          labels: card.labels?.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || [],
          members: card.members?.map(member => ({
            id: member.id,
            fullName: member.fullName,
            username: member.username
          })) || [],
          attachments: card.attachments?.map((attachment: any) => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            mimeType: attachment.mimeType,
            date: attachment.date
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
            text: `Error getting board cards: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const boardTools = new Map<string, ExecutableTool>();
boardTools.set(listBoards.definition.name, listBoards);
boardTools.set(getBoardDetails.definition.name, getBoardDetails);
boardTools.set(getBoardLists.definition.name, getBoardLists);
boardTools.set(getBoardCards.definition.name, getBoardCards);
