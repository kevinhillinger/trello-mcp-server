export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  dateLastActivity: string;
  prefs: {
    permissionLevel: string;
    voting: string;
    comments: string;
    invitations: string;
    selfJoin: boolean;
    cardCovers: boolean;
    background: string;
    backgroundColor: string;
  };
  lists?: TrelloList[];
  cards?: TrelloCard[];
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
  subscribed: boolean;
  idBoard: string;
  cards?: TrelloCard[];
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  pos: number;
  idBoard: string;
  idList: string;
  dateLastActivity: string;
  due: string | null;
  dueComplete: boolean;
  labels: TrelloLabel[];
  members: TrelloMember[];
  checklists: TrelloChecklist[];
  attachments?: TrelloAttachment[];
  badges: {
    votes: number;
    viewingMemberVoted: boolean;
    subscribed: boolean;
    fogbugz: string;
    checkItems: number;
    checkItemsChecked: number;
    comments: number;
    attachments: number;
    description: boolean;
    due: string | null;
    dueComplete: boolean;
  };
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
  idBoard: string;
  uses: number;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarHash: string | null;
  avatarUrl: string | null;
  initials: string;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
  due: string | null;
  idMember: string | null;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  /** 
   * URL of the attachment. 
   * - If isUpload is false: This will be an external link URL
   * - If isUpload is true: This will be a local file path in the resources folder after download
   */
  url: string;
  mimeType: string;
  date: string;
  bytes: number;
  /** 
   * Indicates whether this attachment is a file upload (true) or an external link (false).
   * When true, the file will be downloaded locally and url will contain the local file path.
   */
  isUpload: boolean;
  previews?: {
    id: string;
    width: number;
    height: number;
    url: string;
  }[];
}

export interface CreateCardRequest {
  name: string;
  desc?: string | undefined;
  idList: string;
  pos?: number | string | undefined;
  due?: string | undefined;
  idMembers?: string[] | undefined;
  idLabels?: string[] | undefined;
}

export interface UpdateCardRequest {
  name?: string | undefined;
  desc?: string | undefined;
  closed?: boolean | undefined;
  due?: string | null | undefined;
  dueComplete?: boolean | undefined;
  idList?: string | undefined;
  pos?: number | string | undefined;
  idMembers?: string[] | undefined;
  idLabels?: string[] | undefined;
}

export interface MoveCardRequest {
  idList: string;
  pos?: number | string | undefined;
}

export interface CreateLabelRequest {
  name: string;
  color: string | null;
  idBoard: string;
}

export interface UpdateLabelRequest {
  name?: string | undefined;
  color?: string | null | undefined;
}

export interface UpdateLabelFieldRequest {
  field: 'name' | 'color';
  value: string;
}

export interface TrelloError {
  message: string;
  error?: string;
  status?: number;
  code?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface TrelloApiResponse<T> {
  data: T;
  rateLimit?: RateLimitInfo | undefined;
}