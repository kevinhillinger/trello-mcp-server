export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  descData?: string;
  closed: boolean;
  idMemberCreator?: string;
  idOrganization?: string;
  pinned?: boolean;
  url: string;
  shortUrl: string;
  shortLink?: string;
  dateLastActivity: string;
  dateLastView?: string;
  prefs: {
    permissionLevel: string;
    hideVotes?: boolean;
    voting: string;
    comments: string;
    invitations: string;
    selfJoin: boolean;
    cardCovers: boolean;
    isTemplate?: boolean;
    cardAging?: string;
    calendarFeedEnabled?: boolean;
    background: string;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundImageScaled?: Array<{
      width: number;
      height: number;
      url: string;
    }>;
    backgroundTile?: boolean;
    backgroundBrightness?: string;
    backgroundBottomColor?: string;
    backgroundTopColor?: string;
    canBePublic?: boolean;
    canBeEnterprise?: boolean;
    canBeOrg?: boolean;
    canBePrivate?: boolean;
    canInvite?: boolean;
  };
  labelNames?: {
    green?: string;
    yellow?: string;
    orange?: string;
    red?: string;
    purple?: string;
    blue?: string;
    sky?: string;
    lime?: string;
    pink?: string;
    black?: string;
  };
  limits?: Record<string, any>;
  starred?: boolean;
  memberships?: string;
  subscribed?: boolean;
  powerUps?: string;
  idTags?: string;
  datePluginDisable?: string | null;
  creationMethod?: string | null;
  ixUpdate?: number;
  templateGallery?: string | null;
  enterpriseOwned?: boolean;
  lists?: TrelloList[];
  cards?: TrelloCard[];
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
  softLimit?: string;
  subscribed: boolean;
  idBoard: string;
  limits?: Record<string, any>;
  cards?: TrelloCard[];
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  descData?: {
    emoji?: Record<string, any>;
  };
  closed: boolean;
  url: string;
  shortUrl: string;
  shortLink?: string;
  pos: number;
  idBoard: string;
  idList: string;
  idShort?: number;
  idAttachmentCover?: string | null;
  idMembers?: string[];
  idMembersVoted?: string[];
  idChecklists?: Array<string | TrelloChecklist>;
  idLabels?: string[];
  address?: string | null;
  cardRole?: 'separator' | 'board' | 'mirror' | 'link' | null;
  checkItemStates?: string[];
  coordinates?: string | null;
  creationMethod?: string | null;
  dateLastActivity: string;
  due: string | null;
  dueReminder?: string | null;
  dueComplete: boolean;
  locationName?: string | null;
  manualCoverAttachment?: boolean;
  mirrorSourceId?: string | null;
  labels: TrelloLabel[];
  members: TrelloMember[];
  checklists: TrelloChecklist[];
  attachments?: TrelloAttachment[];
  badges: {
    attachmentsByType?: {
      trello?: {
        board?: number;
        card?: number;
      };
    };
    location?: boolean;
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
    start?: string | null;
    dueComplete: boolean;
  };
  cover?: {
    idAttachment?: string | null;
    color?: string | null;
    idUploadedBackground?: boolean | null;
    size?: 'normal';
    brightness?: 'light' | 'dark';
    isTemplate?: boolean;
  };
  limits?: Record<string, any>;
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
  idBoard: string;
  uses?: number;
}

export interface TrelloMember {
  id: string;
  activityBlocked?: boolean;
  avatarHash: string | null;
  avatarUrl: string | null;
  bio?: string;
  bioData?: {
    emoji?: Record<string, any>;
  };
  confirmed?: boolean;
  fullName: string;
  idEnterprise?: string;
  idEnterprisesDeactivated?: string[];
  idMemberReferrer?: string | null;
  idPremOrgsAdmin?: string[];
  initials: string;
  memberType?: 'normal' | 'ghost';
  nonPublic?: {
    fullName?: string;
    initials?: string;
    avatarUrl?: string;
    avatarHash?: string;
  };
  nonPublicAvailable?: boolean;
  products?: number[];
  url?: string;
  username: string;
  status?: 'disconnected' | string;
  aaEmail?: string | null;
  aaEnrolledDate?: string | null;
  aaId?: string | null;
  avatarSource?: 'gravatar' | 'upload';
  email?: string;
  gravatarHash?: string;
  idBoards?: string[];
  idOrganizations?: string[];
  idEnterprisesAdmin?: string[];
  limits?: Record<string, any>;
  loginTypes?: Array<'password' | 'saml'>;
  marketingOptIn?: {
    optedIn?: boolean;
    date?: string;
  };
  messagesDismissed?: Array<{
    name?: string;
    count?: number;
    lastDismissed?: string;
  }>;
  oneTimeMessagesDismissed?: string[];
  prefs?: Record<string, any>;
  trophies?: string[];
  uploadedAvatarHash?: string | null;
  uploadedAvatarUrl?: string | null;
  premiumFeatures?: string[];
  idBoardsPinned?: string[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  limits?: Record<string, any>;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  idChecklist?: string;
  name: string;
  nameData?: string | null;
  state: 'complete' | 'incomplete';
  pos: number;
  due?: string | null;
  dueReminder?: string | null;
  idMember?: string | null;
  type?: string;
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
  bytes: number | null;
  edgeColor?: string | null;
  idMember?: string;
  /** 
   * Indicates whether this attachment is a file upload (true) or an external link (false).
   * When true, the file will be downloaded locally and url will contain the local file path.
   */
  isUpload: boolean;
  pos?: number;
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