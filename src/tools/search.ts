import { type ExecutableTool } from '../types/mcp.js';
import { z } from 'zod';
import { client } from '../trello/client.js';
import { formatValidationError } from '../utils/validation.js';

const validateSearch = (args: unknown) => {
  const schema = z.object({
    query: z.string().min(1, 'Search query is required').max(16384, 'Query must not exceed 16384 characters'),
    idBoards: z.string().optional(),
    idOrganizations: z.string().optional(),
    idCards: z.string().optional(),
    modelTypes: z.string().optional(),
    board_fields: z.string().optional(),
    boards_limit: z.number().min(1).max(1000).optional(),
    board_organization: z.boolean().optional(),
    card_fields: z.string().optional(),
    cards_limit: z.number().min(1).max(1000).optional(),
    cards_page: z.number().min(0).max(100).optional(),
    card_board: z.boolean().optional(),
    card_list: z.boolean().optional(),
    card_members: z.boolean().optional(),
    card_stickers: z.boolean().optional(),
    card_attachments: z.string().optional(),
    organization_fields: z.string().optional(),
    organizations_limit: z.number().min(1).max(1000).optional(),
    member_fields: z.string().optional(),
    members_limit: z.number().min(1).max(1000).optional(),
    partial: z.boolean().optional()
  });

  return schema.parse(args);
};

const search: ExecutableTool = {
  definition: {
    name: 'search',
    description: 'Search across Trello content (boards, cards, members, organizations). Use this to find specific items by keywords or phrases.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (1 to 16384 characters)',
          minLength: 1,
          maxLength: 16384
        },
        idBoards: {
          type: 'string',
          description: '"mine" or a comma-separated list of Board IDs to limit search scope'
        },
        idOrganizations: {
          type: 'string',
          description: 'A comma-separated list of Organization IDs to limit search scope'
        },
        idCards: {
          type: 'string',
          description: 'A comma-separated list of Card IDs to limit search scope'
        },
        modelTypes: {
          type: 'string',
          description: 'What types to search: "all" or comma-separated list of: actions, boards, cards, members, organizations',
          default: 'all'
        },
        board_fields: {
          type: 'string',
          description: 'Board fields to return: "all" or comma-separated list of: closed, dateLastActivity, dateLastView, desc, descData, idOrganization, invitations, invited, labelNames, memberships, name, pinned, powerUps, prefs, shortLink, shortUrl, starred, subscribed, url',
          default: 'name,idOrganization'
        },
        boards_limit: {
          type: 'integer',
          description: 'Maximum number of boards to return (max 1000)',
          minimum: 1,
          maximum: 1000,
          default: 10
        },
        board_organization: {
          type: 'boolean',
          description: 'Whether to include the parent organization with board results',
          default: false
        },
        card_fields: {
          type: 'string',
          description: 'Card fields to return: "all" or comma-separated list of: badges, checkItemStates, closed, dateLastActivity, desc, descData, due, idAttachmentCover, idBoard, idChecklists, idLabels, idList, idMembers, idMembersVoted, idShort, labels, manualCoverAttachment, name, pos, shortLink, shortUrl, subscribed, url',
          default: 'all'
        },
        cards_limit: {
          type: 'integer',
          description: 'Maximum number of cards to return (max 1000)',
          minimum: 1,
          maximum: 1000,
          default: 10
        },
        cards_page: {
          type: 'integer',
          description: 'Page of card results (max 100)',
          minimum: 0,
          maximum: 100,
          default: 0
        },
        card_board: {
          type: 'boolean',
          description: 'Whether to include the parent board with card results',
          default: false
        },
        card_list: {
          type: 'boolean',
          description: 'Whether to include the parent list with card results',
          default: false
        },
        card_members: {
          type: 'boolean',
          description: 'Whether to include member objects with card results',
          default: false
        },
        card_stickers: {
          type: 'boolean',
          description: 'Whether to include sticker objects with card results',
          default: false
        },
        card_attachments: {
          type: 'string',
          description: 'Whether to include attachments: "true", "false", or "cover" for only cover attachments',
          default: 'false'
        },
        organization_fields: {
          type: 'string',
          description: 'Organization fields to return: "all" or comma-separated list of: billableMemberCount, desc, descData, displayName, idBoards, invitations, invited, logoHash, memberships, name, powerUps, prefs, premiumFeatures, products, url, website',
          default: 'name,displayName'
        },
        organizations_limit: {
          type: 'integer',
          description: 'Maximum number of organizations to return (max 1000)',
          minimum: 1,
          maximum: 1000,
          default: 10
        },
        member_fields: {
          type: 'string',
          description: 'Member fields to return: "all" or comma-separated list of: avatarHash, bio, bioData, confirmed, fullName, idPremOrgsAdmin, initials, memberType, products, status, url, username',
          default: 'avatarHash,fullName,initials,username,confirmed'
        },
        members_limit: {
          type: 'integer',
          description: 'Maximum number of members to return (max 1000)',
          minimum: 1,
          maximum: 1000,
          default: 10
        },
        partial: {
          type: 'boolean',
          description: 'Enable partial matching. When true, searches for content that starts with any word in query. E.g., searching "dev" will match "Development".',
          default: false
        }
      },
      required: ['query']
    }
  },
  callback: async (args: unknown) => {
    try {
      const validated = validateSearch(args);
      const { query, ...options } = validated;
      
      const searchOptions = Object.fromEntries(
        Object.entries(options).filter(([_, v]) => v !== undefined)
      );

      const response = await client.search(
        query,
        Object.keys(searchOptions).length > 0 ? searchOptions : undefined
      );
      const searchResults = response.data;

      const result = {
        summary: `Search results for: "${query}"`,
        query,
        boards: searchResults.boards?.map((board: any) => ({
          id: board.id,
          name: board.name,
          description: board.desc || 'No description',
          url: board.shortUrl,
          closed: board.closed,
          lastActivity: board.dateLastActivity
        })) || [],
        cards: searchResults.cards?.map((card: any) => ({
          id: card.id,
          name: card.name,
          description: card.desc || 'No description',
          url: card.shortUrl,
          listId: card.idList,
          boardId: card.idBoard,
          due: card.due,
          closed: card.closed,
          labels: card.labels?.map((label: any) => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || []
        })) || [],
        members: searchResults.members?.map((member: any) => ({
          id: member.id,
          fullName: member.fullName,
          username: member.username,
          bio: member.bio,
          url: member.url
        })) || [],
        organizations: searchResults.organizations?.map((org: any) => ({
          id: org.id,
          name: org.name,
          displayName: org.displayName,
          description: org.desc,
          url: org.url
        })) || [],
        totalResults: {
          boards: searchResults.boards?.length || 0,
          cards: searchResults.cards?.length || 0,
          members: searchResults.members?.length || 0,
          organizations: searchResults.organizations?.length || 0
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
            text: `Error searching Trello: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
};

export const searchTools = new Map<string, ExecutableTool>();
searchTools.set(search.definition.name, search);
