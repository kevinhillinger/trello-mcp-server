import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import {
  validateCreateLabel,
  validateGetLabel,
  validateUpdateLabel,
  validateDeleteLabel,
  validateUpdateLabelField,
  formatValidationError
} from '../utils/validation.js';

const createLabel: ExecutableTool = {
  tool: {
    name: 'createLabel',
    description: 'Create a new label on a Trello board. Use this to add categorization and visual organization to your cards.',
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
        name: {
          type: 'string',
          description: 'Name of the label (e.g., "Priority", "Bug", "Feature")'
        },
        color: {
          type: ['string', 'null'],
          enum: ['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime', null],
          description: 'Color of the label. Valid values: yellow, purple, blue, red, green, orange, black, sky, pink, lime, or null for no color'
        },
        idBoard: {
          type: 'string',
          description: 'ID of the board where the label will be created (you can get this from get_boards)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['apiKey', 'token', 'name', 'color', 'idBoard']
    }
  },
  callback: async function handleCreateLabel(args: unknown) {
    try {
      const labelData = validateCreateLabel(args);
      const { apiKey, token, ...createData } = labelData;

      const client = new TrelloClient({ apiKey, token });
      const response = await client.createLabel(createData);
      const label = response.data;

      const result = {
        summary: `Created label: ${label.name}`,
        label: {
          id: label.id,
          name: label.name,
          color: label.color,
          boardId: label.idBoard,
          uses: label.uses
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
            text: `Error creating label: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const getLabel: ExecutableTool = {
  tool: {
    name: 'getLabel',
    description: 'Get detailed information about a specific Trello label, including its name, color, and usage.',
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
        labelId: {
          type: 'string',
          description: 'ID of the label to retrieve (you can get this from board details)',
          pattern: '^[a-f0-9]{24}$'
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to return (e.g., "name,color,idBoard"). If omitted, all fields are returned'
        }
      },
      required: ['apiKey', 'token', 'labelId']
    }
  },
  callback: async function handleGetLabel(args: unknown) {
    try {
      const { apiKey, token, labelId, fields } = validateGetLabel(args);

      const client = new TrelloClient({ apiKey, token });
      const response = await client.getLabel(labelId, fields);
      const label = response.data;

      const result = {
        summary: `Label: ${label.name || label.id}`,
        label: {
          id: label.id,
          name: label.name,
          color: label.color,
          boardId: label.idBoard,
          uses: label.uses
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
            text: `Error getting label: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateLabel: ExecutableTool = {
  tool: {
    name: 'updateLabel',
    description: 'Update properties of an existing Trello label. Use this to change the label\'s name or color.',
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
        labelId: {
          type: 'string',
          description: 'ID of the label to update (you can get this from board details)',
          pattern: '^[a-f0-9]{24}$'
        },
        name: {
          type: 'string',
          description: 'New name for the label'
        },
        color: {
          type: ['string', 'null'],
          enum: ['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime', null],
          description: 'New color for the label. Valid values: yellow, purple, blue, red, green, orange, black, sky, pink, lime, or null for no color'
        }
      },
      required: ['apiKey', 'token', 'labelId']
    }
  },
  callback: async function handleUpdateLabel(args: unknown) {
    try {
      const updateData = validateUpdateLabel(args);
      const { apiKey, token, labelId, ...updates } = updateData;

      const client = new TrelloClient({ apiKey, token });
      const response = await client.updateLabel(labelId, updates);
      const label = response.data;

      const result = {
        summary: `Updated label: ${label.name}`,
        label: {
          id: label.id,
          name: label.name,
          color: label.color,
          boardId: label.idBoard,
          uses: label.uses
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
            text: `Error updating label: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const deleteLabel: ExecutableTool = {
  tool: {
    name: 'deleteLabel',
    description: 'Delete a label from a Trello board. Use this to remove unused or obsolete labels. Warning: This will remove the label from all cards that use it.',
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
        labelId: {
          type: 'string',
          description: 'ID of the label to delete (you can get this from board details)',
          pattern: '^[a-f0-9]{24}$'
        }
      },
      required: ['apiKey', 'token', 'labelId']
    }
  },
  callback: async function handleDeleteLabel(args: unknown) {
    try {
      const { apiKey, token, labelId } = validateDeleteLabel(args);

      const client = new TrelloClient({ apiKey, token });
      const response = await client.deleteLabel(labelId);

      const result = {
        summary: `Deleted label ${labelId}`,
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
            text: `Error deleting label: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

const updateLabelField: ExecutableTool = {
  tool: {
    name: 'updateLabelField',
    description: 'Update a specific field on a label. Use this for targeted updates to either the name or color field.',
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
        labelId: {
          type: 'string',
          description: 'ID of the label to update (you can get this from board details)',
          pattern: '^[a-f0-9]{24}$'
        },
        field: {
          type: 'string',
          enum: ['name', 'color'],
          description: 'The field to update: "name" or "color"'
        },
        value: {
          type: 'string',
          description: 'The new value for the field. For color field, valid values are: yellow, purple, blue, red, green, orange, black, sky, pink, lime'
        }
      },
      required: ['apiKey', 'token', 'labelId', 'field', 'value']
    }
  },
  callback: async function handleUpdateLabelField(args: unknown) {
    try {
      const updateData = validateUpdateLabelField(args);
      const { apiKey, token, labelId, field, value } = updateData;

      const client = new TrelloClient({ apiKey, token });
      const response = await client.updateLabelField(labelId, { field, value });
      const label = response.data;

      const result = {
        summary: `Updated label ${field}: ${value}`,
        label: {
          id: label.id,
          name: label.name,
          color: label.color,
          boardId: label.idBoard,
          uses: label.uses
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
            text: `Error updating label field: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const labelTools = new Map<string, ExecutableTool>();
labelTools.set(createLabel.tool.name, createLabel);
labelTools.set(getLabel.tool.name, getLabel);
labelTools.set(updateLabel.tool.name, updateLabel);
labelTools.set(deleteLabel.tool.name, deleteLabel);
labelTools.set(updateLabelField.tool.name, updateLabelField);
