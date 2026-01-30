import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { client } from '../trello/client.js';
import {
  validateCreateChecklist,
  validateGetChecklist,
  validateUpdateChecklist,
  validateDeleteChecklist,
  validateGetChecklistField,
  validateUpdateChecklistField,
  validateGetBoardForChecklist,
  validateGetCardForChecklist,
  validateGetCheckItemsOnChecklist,
  validateCreateCheckItemOnChecklist,
  validateGetCheckItemOnChecklist,
  validateDeleteCheckItemOnChecklist,
  formatValidationError
} from '../utils/validation.js';

const createChecklist: ExecutableTool = {
  definition: {
    name: 'createChecklist',
    description: 'Create a new checklist on a Trello card. Use this to organize tasks or track progress within a card.',
    inputSchema: {
      type: 'object',
      properties: {
        idCard: {
          type: 'string',
          description: 'ID of the card where the checklist will be created',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'Optional name for the checklist (e.g., "Requirements", "Testing Steps")',
          maxLength: 16384
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position of the checklist: "top", "bottom", or specific number'
        },
        idChecklistSource: {
          type: 'string',
          description: 'Optional ID of a checklist to copy from',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['idCard']
    }
  },
  callback: async (args: unknown) => {
    try {
      const checklistData = validateCreateChecklist(args);

      const response = await client.createChecklist(checklistData);
      const checklist = response.data;

      const result = {
        summary: `Created checklist${checklist.name ? `: ${checklist.name}` : ' on card'}`,
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

const getChecklist: ExecutableTool = {
  definition: {
    name: 'getChecklist',
    description: 'Get detailed information about a specific checklist, including its check items.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist to retrieve',
          pattern: '^[a-f0-9]{24}$'
        },
        cards: {
          type: 'string',
          enum: ['all', 'closed', 'none', 'open', 'visible'],
          description: 'Optional: filter cards to include',
          default: 'none'
        },
        checkItems: {
          type: 'string',
          enum: ['all', 'none'],
          description: 'Whether to include check items',
          default: 'all'
        },
        checkItem_fields: {
          type: 'string',
          description: 'Comma-separated list of check item fields to include'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of checklist fields to include (or "all")',
          default: 'all'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, ...options } = validateGetChecklist(args);

      const response = await client.getChecklist(checklistId, options);
      const checklist = response.data;

      const result = {
        summary: `Checklist: ${checklist.name || 'Unnamed'}`,
        checklist: {
          id: checklist.id,
          name: checklist.name,
          cardId: checklist.idCard,
          boardId: checklist.idBoard,
          position: checklist.pos,
          checkItems: checklist.checkItems?.map(item => ({
            id: item.id,
            name: item.name,
            state: item.state,
            position: item.pos,
            due: item.due,
            dueReminder: item.dueReminder,
            assignedMember: item.idMember
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
            text: `Error getting checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateChecklist: ExecutableTool = {
  definition: {
    name: 'updateChecklist',
    description: 'Update a checklist\'s name or position.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist to update',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'New name for the checklist',
          maxLength: 16384
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'New position: "top", "bottom", or specific number'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, ...updates } = validateUpdateChecklist(args);

      const response = await client.updateChecklist(checklistId, updates);
      const checklist = response.data;

      const result = {
        summary: `Updated checklist: ${checklist.name}`,
        checklist: {
          id: checklist.id,
          name: checklist.name,
          cardId: checklist.idCard,
          boardId: checklist.idBoard,
          position: checklist.pos
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
            text: `Error updating checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteChecklist: ExecutableTool = {
  definition: {
    name: 'deleteChecklist',
    description: 'Delete a checklist from a card permanently.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist to delete',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId } = validateDeleteChecklist(args);

      const response = await client.deleteChecklist(checklistId);

      const result = {
        summary: `Deleted checklist ${checklistId}`,
        success: true,
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
            text: `Error deleting checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getChecklistField: ExecutableTool = {
  definition: {
    name: 'getChecklistField',
    description: 'Get a specific field value from a checklist (name or pos).',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        field: {
          type: 'string',
          enum: ['name', 'pos'],
          description: 'The field to retrieve'
        }
      },
      required: ['checklistId', 'field']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, field } = validateGetChecklistField(args);

      const response = await client.getChecklistField(checklistId, field);
      const fieldValue = response.data;

      const result = {
        summary: `Field ${field} value for checklist ${checklistId}`,
        checklistId,
        field,
        value: fieldValue,
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
            text: `Error getting checklist field: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateChecklistField: ExecutableTool = {
  definition: {
    name: 'updateChecklistField',
    description: 'Update a specific field on a checklist (name or pos).',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist to update',
          pattern: '^[a-f0-9]{24}$'
        },
        field: {
          type: 'string',
          enum: ['name', 'pos'],
          description: 'The field to update'
        },
        value: {
          type: 'string',
          description: 'The new value for the field'
        }
      },
      required: ['checklistId', 'field', 'value']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, field, value } = validateUpdateChecklistField(args);

      const response = await client.updateChecklistField(checklistId, { field, value });
      const checklist = response.data;

      const result = {
        summary: `Updated ${field} on checklist`,
        checklist: {
          id: checklist.id,
          name: checklist.name,
          cardId: checklist.idCard,
          boardId: checklist.idBoard,
          position: checklist.pos
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
            text: `Error updating checklist field: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getBoardForChecklist: ExecutableTool = {
  definition: {
    name: 'getBoardForChecklist',
    description: 'Get the board that a checklist belongs to.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of board fields to include (or "all")',
          default: 'all'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, fields } = validateGetBoardForChecklist(args);

      const response = await client.getBoardForChecklist(checklistId, fields);
      const board = response.data;

      const result = {
        summary: `Board for checklist: ${board.name}`,
        board: {
          id: board.id,
          name: board.name,
          description: board.desc || 'No description',
          url: board.shortUrl,
          closed: board.closed
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
            text: `Error getting board for checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getCardForChecklist: ExecutableTool = {
  definition: {
    name: 'getCardForChecklist',
    description: 'Get the card that a checklist belongs to.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId } = validateGetCardForChecklist(args);

      const response = await client.getCardForChecklist(checklistId);
      const card = response.data;

      const result = {
        summary: `Card for checklist: ${card.name}`,
        card: {
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
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
            text: `Error getting card for checklist: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getCheckItemsOnChecklist: ExecutableTool = {
  definition: {
    name: 'getCheckItemsOnChecklist',
    description: 'Get all check items on a checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        filter: {
          type: 'string',
          enum: ['all', 'none'],
          description: 'Filter for check items',
          default: 'all'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of check item fields to include'
        }
      },
      required: ['checklistId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, ...options } = validateGetCheckItemsOnChecklist(args);

      const response = await client.getCheckItemsOnChecklist(checklistId, options);
      const checkItems = response.data;

      const result = {
        summary: `Found ${checkItems.length} check item(s) on checklist`,
        checklistId,
        checkItems: checkItems.map(item => ({
          id: item.id,
          name: item.name,
          state: item.state,
          position: item.pos,
          due: item.due,
          dueReminder: item.dueReminder,
          assignedMember: item.idMember
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
            text: `Error getting check items: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const createCheckItemOnChecklist: ExecutableTool = {
  definition: {
    name: 'createCheckItemOnChecklist',
    description: 'Create a new check item on a checklist. Use this to add individual tasks to a checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist to add the check item to',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'Name/description of the check item',
          maxLength: 16384
        },
        pos: {
          oneOf: [
            { type: 'number', minimum: 0 },
            { type: 'string', enum: ['top', 'bottom'] }
          ],
          description: 'Position: "top", "bottom", or specific number'
        },
        checked: {
          type: 'boolean',
          description: 'Whether the item is already checked',
          default: false
        },
        due: {
          type: 'string',
          description: 'Optional due date for the check item'
        },
        dueReminder: {
          type: 'number',
          description: 'Optional due reminder in seconds',
          nullable: true
        },
        idMember: {
          type: 'string',
          description: 'Optional member ID to assign to this check item',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['checklistId', 'name']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, ...checkItemData } = validateCreateCheckItemOnChecklist(args);

      const response = await client.createCheckItemOnChecklist(checklistId, checkItemData);
      const checkItem = response.data;

      const result = {
        summary: `Created check item: ${checkItem.name}`,
        checkItem: {
          id: checkItem.id,
          name: checkItem.name,
          state: checkItem.state,
          position: checkItem.pos,
          due: checkItem.due,
          dueReminder: checkItem.dueReminder,
          assignedMember: checkItem.idMember
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
            text: `Error creating check item: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getCheckItemOnChecklist: ExecutableTool = {
  definition: {
    name: 'getCheckItemOnChecklist',
    description: 'Get detailed information about a specific check item on a checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        checkItemId: {
          type: 'string',
          description: 'ID of the check item to retrieve',
          pattern: '^[a-f0-9]{24}$'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of check item fields to include'
        }
      },
      required: ['checklistId', 'checkItemId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, checkItemId, fields } = validateGetCheckItemOnChecklist(args);

      const response = await client.getCheckItemOnChecklist(checklistId, checkItemId, fields);
      const checkItem = response.data;

      const result = {
        summary: `Check item: ${checkItem.name}`,
        checkItem: {
          id: checkItem.id,
          name: checkItem.name,
          state: checkItem.state,
          position: checkItem.pos,
          due: checkItem.due,
          dueReminder: checkItem.dueReminder,
          assignedMember: checkItem.idMember
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
            text: `Error getting check item: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteCheckItemOnChecklist: ExecutableTool = {
  definition: {
    name: 'deleteCheckItemOnChecklist',
    description: 'Delete a check item from a checklist permanently.',
    inputSchema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description: 'ID of the checklist',
          pattern: '^[a-f0-9]{24}$'
        },
        checkItemId: {
          type: 'string',
          description: 'ID of the check item to delete',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['checklistId', 'checkItemId']
    }
  },
  callback: async (args: unknown) => {
    try {
      const { checklistId, checkItemId } = validateDeleteCheckItemOnChecklist(args);

      const response = await client.deleteCheckItemOnChecklist(checklistId, checkItemId);

      const result = {
        summary: `Deleted check item ${checkItemId} from checklist ${checklistId}`,
        success: true,
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

// Export all checklist tools as a map
export const checklistTools = new Map<string, ExecutableTool>([
  ['createChecklist', createChecklist],
  ['getChecklist', getChecklist],
  ['updateChecklist', updateChecklist],
  ['deleteChecklist', deleteChecklist],
  ['getChecklistField', getChecklistField],
  ['updateChecklistField', updateChecklistField],
  ['getBoardForChecklist', getBoardForChecklist],
  ['getCardForChecklist', getCardForChecklist],
  ['getCheckItemsOnChecklist', getCheckItemsOnChecklist],
  ['createCheckItemOnChecklist', createCheckItemOnChecklist],
  ['getCheckItemOnChecklist', getCheckItemOnChecklist],
  ['deleteCheckItemOnChecklist', deleteCheckItemOnChecklist]
]);
