import { logger } from '../utils/logger.js';
import type { 
  TrelloCredentials, 
  TrelloBoard, 
  TrelloList, 
  TrelloCard, 
  TrelloLabel,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  CreateLabelRequest,
  UpdateLabelRequest,
  UpdateLabelFieldRequest,
  TrelloError,
  RateLimitInfo,
  TrelloApiResponse
} from '../types/trello.js';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class TrelloClient {
  private baseURL = 'https://api.trello.com/1';
  private credentials: TrelloCredentials;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  constructor(credentials: TrelloCredentials) {
    this.credentials = credentials;
  }

  private async fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
    const { timeout = 15000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private buildURL(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.set('key', this.credentials.apiKey);
    url.searchParams.set('token', this.credentials.token);
    
    // Add additional parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      });
    }
    
    return url.toString();
  }

  private extractRateLimitInfo(response: Response): RateLimitInfo | undefined {
    const limit = response.headers.get('x-rate-limit-api-key-limit');
    const remaining = response.headers.get('x-rate-limit-api-key-remaining');
    const reset = response.headers.get('x-rate-limit-api-key-reset');
    
    if (limit) {
      return {
        limit: parseInt(limit, 10) || 300,
        remaining: parseInt(remaining || '0', 10),
        resetTime: parseInt(reset || '0', 10)
      };
    }
    return undefined;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private handleError(error: unknown): TrelloError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error - unable to reach Trello API',
        error: error.message,
        code: 'NETWORK_ERROR'
      };
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        message: 'Request timeout - Trello API did not respond in time',
        error: error.message,
        code: 'TIMEOUT_ERROR'
      };
    }
    
    // For Response objects (HTTP errors)
    if (error && typeof error === 'object' && 'status' in error) {
      const response = error as Response;
      const status = response.status;
      
      let message = 'Trello API error';
      let code = 'API_ERROR';
      
      switch (status) {
        case 401:
          message = 'Invalid or expired Trello credentials. Please update your API key and token in Claude.app\'s MCP connection settings.';
          code = 'INVALID_CREDENTIALS';
          break;
        case 403:
          message = 'Insufficient permissions. Your Trello token may need additional permissions, or the resource may be private. Please check your Trello settings or update your token in Claude.app.';
          code = 'INSUFFICIENT_PERMISSIONS';
          break;
        case 404:
          message = 'Resource not found';
          code = 'NOT_FOUND';
          break;
        case 429:
          message = 'Rate limit exceeded';
          code = 'RATE_LIMIT_EXCEEDED';
          break;
        case 500:
          message = 'Trello server error';
          code = 'SERVER_ERROR';
          break;
        default:
          message = `HTTP ${status} error`;
      }
      
      return {
        message,
        error: `${status} - ${response.statusText}`,
        status,
        code
      };
    }
    
    return {
      message: 'Unknown error occurred',
      error: error instanceof Error ? error.message : String(error),
      code: 'UNKNOWN_ERROR'
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: FetchOptions & { params?: Record<string, string> } = {},
    operation: string
  ): Promise<TrelloApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.buildURL(endpoint, params);
    const startTime = Date.now();
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TrelloMCPServer/1.0.0 (Node.js 22)',
            ...fetchOptions.headers
          },
          ...fetchOptions
        });
        
        const rateLimit = this.extractRateLimitInfo(response);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
            logger.warn(`Rate limited, waiting ${retryAfter}s`, {
              operation,
              attempt,
              maxRetries: this.retryConfig.maxRetries
            });
            await this.sleep(retryAfter * 1000);
            continue;
          }
          
          throw response;
        }
        
        const data = await response.json() as T;
        
        logger.info(`Trello API ${operation} successful`, {
          status: response.status,
          duration: `${duration}ms`,
          rateLimit
        });

        return {
          data,
          rateLimit
        };
        
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        if (error instanceof Response && error.status === 429) {
          continue; // Already handled above
        }
        
        if (attempt < this.retryConfig.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.debug(`Retrying ${operation}`, {
            delay: `${delay}ms`,
            attempt,
            maxRetries: this.retryConfig.maxRetries
          });
          await this.sleep(delay);
          continue;
        }
        
        // Final attempt failed
        const trelloError = this.handleError(error);
        logger.error(`Trello API ${operation} failed`, {
          error: trelloError.message,
          status: trelloError.status,
          duration: `${duration}ms`
        });

        throw trelloError;
      }
    }
    
    throw this.handleError(lastError);
  }

  private shouldRetry(error: unknown): boolean {
    // Network errors should be retried
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors should be retried
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    
    // HTTP errors
    if (error instanceof Response) {
      const status = error.status;
      return status >= 500 || status === 429; // Server errors and rate limits
    }
    
    return false;
  }

  async getMyBoards(filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloBoard[]>> {
    return this.makeRequest<TrelloBoard[]>(
      '/members/me/boards',
      { params: { filter: filter || 'open' } },
      'Get user boards'
    );
  }

  async getBoard(boardId: string, includeDetails = false): Promise<TrelloApiResponse<TrelloBoard>> {
    const params: Record<string, string> = {};
    if (includeDetails) {
      params.lists = 'open';
      params.cards = 'open';
      params.card_members = 'true';
      params.card_labels = 'true';
    }
    
    return this.makeRequest<TrelloBoard>(
      `/boards/${boardId}`,
      { params },
      `Get board ${boardId}`
    );
  }

  async getBoardLists(boardId: string, filter?: 'all' | 'open' | 'closed'): Promise<TrelloApiResponse<TrelloList[]>> {
    return this.makeRequest<TrelloList[]>(
      `/boards/${boardId}/lists`,
      { params: { filter: filter || 'open' } },
      `Get board ${boardId} lists`
    );
  }

  async createCard(cardData: CreateCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      '/cards',
      {
        method: 'POST',
        body: JSON.stringify(cardData)
      },
      `Create card "${cardData.name}"`
    );
  }

  async updateCard(cardId: string, updates: UpdateCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update card ${cardId}`
    );
  }

  async moveCard(cardId: string, moveData: MoveCardRequest): Promise<TrelloApiResponse<TrelloCard>> {
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(moveData)
      },
      `Move card ${cardId}`
    );
  }

  async getCard(cardId: string, includeDetails = false): Promise<TrelloApiResponse<TrelloCard>> {
    const params: Record<string, string> = {};
    if (includeDetails) {
      params.members = 'true';
      params.labels = 'true';
      params.checklists = 'all';
      params.badges = 'true';
    }
    
    return this.makeRequest<TrelloCard>(
      `/cards/${cardId}`,
      { params },
      `Get card ${cardId}`
    );
  }

  async deleteCard(cardId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}`,
      { method: 'DELETE' },
      `Delete card ${cardId}`
    );
  }

  async getBoardMembers(boardId: string): Promise<TrelloApiResponse<any[]>> {
    return this.makeRequest<any[]>(
      `/boards/${boardId}/members`,
      {},
      `Get board ${boardId} members`
    );
  }

  async getBoardLabels(boardId: string): Promise<TrelloApiResponse<any[]>> {
    return this.makeRequest<any[]>(
      `/boards/${boardId}/labels`,
      {},
      `Get board ${boardId} labels`
    );
  }

  async search(query: string, options?: {
    idBoards?: string;
    idOrganizations?: string;
    idCards?: string;
    modelTypes?: string;
    board_fields?: string;
    boards_limit?: number;
    board_organization?: boolean;
    card_fields?: string;
    cards_limit?: number;
    cards_page?: number;
    card_board?: boolean;
    card_list?: boolean;
    card_members?: boolean;
    card_stickers?: boolean;
    card_attachments?: string;
    organization_fields?: string;
    organizations_limit?: number;
    member_fields?: string;
    members_limit?: number;
    partial?: boolean;
  }): Promise<TrelloApiResponse<any>> {
    const params: Record<string, string> = {
      query
    };

    if (options?.idBoards) {
      params.idBoards = options.idBoards;
    }
    if (options?.idOrganizations) {
      params.idOrganizations = options.idOrganizations;
    }
    if (options?.idCards) {
      params.idCards = options.idCards;
    }
    if (options?.modelTypes) {
      params.modelTypes = options.modelTypes;
    }
    if (options?.board_fields) {
      params.board_fields = options.board_fields;
    }
    if (options?.boards_limit !== undefined) {
      params.boards_limit = options.boards_limit.toString();
    }
    if (options?.board_organization !== undefined) {
      params.board_organization = options.board_organization.toString();
    }
    if (options?.card_fields) {
      params.card_fields = options.card_fields;
    }
    if (options?.cards_limit !== undefined) {
      params.cards_limit = options.cards_limit.toString();
    }
    if (options?.cards_page !== undefined) {
      params.cards_page = options.cards_page.toString();
    }
    if (options?.card_board !== undefined) {
      params.card_board = options.card_board.toString();
    }
    if (options?.card_list !== undefined) {
      params.card_list = options.card_list.toString();
    }
    if (options?.card_members !== undefined) {
      params.card_members = options.card_members.toString();
    }
    if (options?.card_stickers !== undefined) {
      params.card_stickers = options.card_stickers.toString();
    }
    if (options?.card_attachments) {
      params.card_attachments = options.card_attachments;
    }
    if (options?.organization_fields) {
      params.organization_fields = options.organization_fields;
    }
    if (options?.organizations_limit !== undefined) {
      params.organizations_limit = options.organizations_limit.toString();
    }
    if (options?.member_fields) {
      params.member_fields = options.member_fields;
    }
    if (options?.members_limit !== undefined) {
      params.members_limit = options.members_limit.toString();
    }
    if (options?.partial !== undefined) {
      params.partial = options.partial.toString();
    }

    return this.makeRequest<any>(
      '/search',
      { params },
      `Search for "${query}"`
    );
  }

  async getListCards(listId: string, options?: {
    filter?: 'all' | 'open' | 'closed';
    fields?: string[];
  }): Promise<TrelloApiResponse<TrelloCard[]>> {
    const params: Record<string, string> = {};
    
    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    
    return this.makeRequest<TrelloCard[]>(
      `/lists/${listId}/cards`,
      { params },
      `Get cards in list ${listId}`
    );
  }

  async addCommentToCard(cardId: string, text: string): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/actions/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text })
      },
      `Add comment to card ${cardId}`
    );
  }

  async createList(listData: {
    name: string;
    idBoard: string;
    pos?: string | number;
  }): Promise<TrelloApiResponse<TrelloList>> {
    return this.makeRequest<TrelloList>(
      '/lists',
      {
        method: 'POST',
        body: JSON.stringify(listData)
      },
      `Create list "${listData.name}"`
    );
  }

  async getMember(memberId: string, options?: {
    fields?: string[];
    boards?: string;
    organizations?: string;
  }): Promise<TrelloApiResponse<any>> {
    const params: Record<string, string> = {};
    
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }
    if (options?.boards) {
      params.boards = options.boards;
    }
    if (options?.organizations) {
      params.organizations = options.organizations;
    }
    
    return this.makeRequest<any>(
      `/members/${memberId}`,
      { params },
      `Get member ${memberId}`
    );
  }

  async getCurrentUser(): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      '/members/me',
      { params: { boards: 'open', organizations: 'all' } },
      'Get current user'
    );
  }

  async getBoardCards(boardId: string, options?: {
    attachments?: string;
    members?: string;
    filter?: string;
  }): Promise<TrelloApiResponse<TrelloCard[]>> {
    const params: Record<string, string> = {};
    
    if (options?.attachments) {
      params.attachments = options.attachments;
    }
    if (options?.members) {
      params.members = options.members;
    }
    if (options?.filter) {
      params.filter = options.filter;
    }
    
    return this.makeRequest<TrelloCard[]>(
      `/boards/${boardId}/cards`,
      { params },
      `Get cards in board ${boardId}`
    );
  }

  async getCardActions(cardId: string, options?: {
    filter?: string;
    limit?: number;
  }): Promise<TrelloApiResponse<any[]>> {
    const params: Record<string, string> = {};
    
    if (options?.filter) {
      params.filter = options.filter;
    }
    if (options?.limit) {
      params.limit = options.limit.toString();
    }
    
    return this.makeRequest<any[]>(
      `/cards/${cardId}/actions`,
      { params },
      `Get actions for card ${cardId}`
    );
  }

  async getCardAttachments(cardId: string, options?: {
    fields?: string[];
  }): Promise<TrelloApiResponse<any[]>> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<any[]>(
      `/cards/${cardId}/attachments`,
      { params },
      `Get attachments for card ${cardId}`
    );
  }

  async getCardAttachment(cardId: string, attachmentId: string, options?: {
    fields?: string[];
  }): Promise<TrelloApiResponse<any>> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<any>(
      `/cards/${cardId}/attachments/${attachmentId}`,
      { params },
      `Get attachment ${attachmentId} for card ${cardId}`
    );
  }

  async getCardChecklists(cardId: string, options?: {
    checkItems?: string;
    fields?: string[];
  }): Promise<TrelloApiResponse<any[]>> {
    const params: Record<string, string> = {};

    if (options?.checkItems) {
      params.checkItems = options.checkItems;
    }
    if (options?.fields) {
      params.fields = options.fields.join(',');
    }

    return this.makeRequest<any[]>(
      `/cards/${cardId}/checklists`,
      { params },
      `Get checklists for card ${cardId}`
    );
  }

  async addAttachmentToCard(cardId: string, data: {
    url?: string;
    file?: string;
    name?: string;
    mimeType?: string;
    setCover?: boolean;
  }): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      `Add attachment to card ${cardId}`
    );
  }

  async deleteAttachmentFromCard(cardId: string, attachmentId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
      `Delete attachment ${attachmentId} from card ${cardId}`
    );
  }

  async createChecklistOnCard(cardId: string, data: {
    name?: string;
    idChecklistSource?: string;
    pos?: string | number;
  }): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/checklists`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      `Create checklist on card ${cardId}`
    );
  }

  async updateCheckItem(cardId: string, checkItemId: string, data: {
    name?: string;
    state?: 'complete' | 'incomplete';
    pos?: string | number;
  }): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/checkItem/${checkItemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      `Update check item ${checkItemId} on card ${cardId}`
    );
  }

  async deleteCheckItem(cardId: string, checkItemId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/checkItem/${checkItemId}`,
      { method: 'DELETE' },
      `Delete check item ${checkItemId} from card ${cardId}`
    );
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/idLabels`,
      {
        method: 'POST',
        body: JSON.stringify({ value: labelId })
      },
      `Add label ${labelId} to card ${cardId}`
    );
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/idLabels/${labelId}`,
      { method: 'DELETE' },
      `Remove label ${labelId} from card ${cardId}`
    );
  }

  async addMemberToCard(cardId: string, memberId: string): Promise<TrelloApiResponse<any>> {
    return this.makeRequest<any>(
      `/cards/${cardId}/idMembers`,
      {
        method: 'POST',
        body: JSON.stringify({ value: memberId })
      },
      `Add member ${memberId} to card ${cardId}`
    );
  }

  async removeMemberFromCard(cardId: string, memberId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/cards/${cardId}/idMembers/${memberId}`,
      { method: 'DELETE' },
      `Remove member ${memberId} from card ${cardId}`
    );
  }

  // Label operations
  async createLabel(labelData: CreateLabelRequest): Promise<TrelloApiResponse<TrelloLabel>> {
    return this.makeRequest<TrelloLabel>(
      '/labels',
      {
        method: 'POST',
        body: JSON.stringify(labelData)
      },
      `Create label "${labelData.name}"`
    );
  }

  async getLabel(labelId: string, fields?: string): Promise<TrelloApiResponse<TrelloLabel>> {
    const params: Record<string, string> = {};
    if (fields) {
      params.fields = fields;
    }

    return this.makeRequest<TrelloLabel>(
      `/labels/${labelId}`,
      { params },
      `Get label ${labelId}`
    );
  }

  async updateLabel(labelId: string, updates: UpdateLabelRequest): Promise<TrelloApiResponse<TrelloLabel>> {
    return this.makeRequest<TrelloLabel>(
      `/labels/${labelId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      },
      `Update label ${labelId}`
    );
  }

  async deleteLabel(labelId: string): Promise<TrelloApiResponse<void>> {
    return this.makeRequest<void>(
      `/labels/${labelId}`,
      { method: 'DELETE' },
      `Delete label ${labelId}`
    );
  }

  async updateLabelField(labelId: string, fieldData: UpdateLabelFieldRequest): Promise<TrelloApiResponse<TrelloLabel>> {
    const params: Record<string, string> = {
      value: fieldData.value
    };

    return this.makeRequest<TrelloLabel>(
      `/labels/${labelId}/${fieldData.field}`,
      {
        method: 'PUT',
        params
      },
      `Update label ${labelId} field ${fieldData.field}`
    );
  }
}