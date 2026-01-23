import { z } from 'zod';

const trelloIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Must be a valid 24-character Trello ID');
const trelloIdOptionalSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Must be a valid 24-character Trello ID').optional();

export const credentialsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required')
});

export const listBoardsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  filter: z.enum(['all', 'open', 'closed']).optional().default('open')
});

export const getBoardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  boardId: trelloIdSchema,
  includeDetails: z.boolean().optional().default(false)
});

export const getBoardListsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  boardId: trelloIdSchema,
  filter: z.enum(['all', 'open', 'closed']).optional().default('open')
});

export const createCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Card name is required').max(16384, 'Card name too long'),
  desc: z.string().max(16384, 'Description too long').optional(),
  idList: trelloIdSchema,
  pos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional(),
  due: z.string().datetime().optional(),
  idMembers: z.array(trelloIdSchema).optional(),
  idLabels: z.array(trelloIdSchema).optional()
});

export const updateCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  name: z.string().min(1).max(16384).optional(),
  desc: z.string().max(16384).optional(),
  closed: z.boolean().optional(),
  due: z.string().datetime().nullable().optional(),
  dueComplete: z.boolean().optional(),
  idList: trelloIdOptionalSchema,
  pos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional(),
  idMembers: z.array(trelloIdSchema).optional(),
  idLabels: z.array(trelloIdSchema).optional()
});

export const moveCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  idList: trelloIdSchema,
  pos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional()
});

export const getCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  includeDetails: z.boolean().optional().default(false)
});

export const deleteCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema
});

export const addAttachmentToCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  url: z.string().url('Must be a valid URL').optional(),
  file: z.instanceof(Buffer).optional(),
  name: z.string().max(256, 'Name too long').optional(),
  mimeType: z.string().optional(),
  setCover: z.boolean().optional()
}).refine(
  (data) => data.url || data.file,
  { message: 'Either url or file must be provided' }
).refine(
  (data) => !data.file || data.name,
  { message: 'name is required when file is provided' }
);

export const deleteAttachmentFromCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  attachmentId: trelloIdSchema
});

export const createChecklistOnCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  name: z.string().min(1, 'Checklist name is required').max(16384, 'Checklist name too long').optional(),
  idChecklistSource: trelloIdOptionalSchema,
  pos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional()
});

export const updateCheckItemSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  checkItemId: trelloIdSchema,
  name: z.string().min(1).max(16384).optional(),
  state: z.enum(['complete', 'incomplete']).optional(),
  pos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional()
});

export const deleteCheckItemSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  checkItemId: trelloIdSchema
});

export const addLabelToCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  labelId: trelloIdSchema
});

export const removeLabelFromCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  labelId: trelloIdSchema
});

export const addMemberToCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  memberId: trelloIdSchema
});

export const removeMemberFromCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  memberId: trelloIdSchema
});

export const archiveCardSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  cardId: trelloIdSchema,
  archive: z.boolean().optional().default(true)
});

// Label validation schemas
const labelColorSchema = z.enum(['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime']).nullable();

export const createLabelSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Label name is required').max(16384, 'Label name too long'),
  color: labelColorSchema,
  idBoard: trelloIdSchema
});

export const getLabelSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  labelId: trelloIdSchema,
  fields: z.string().optional()
});

export const updateLabelSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  labelId: trelloIdSchema,
  name: z.string().min(1).max(16384).optional(),
  color: labelColorSchema.optional()
});

export const deleteLabelSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  labelId: trelloIdSchema
});

export const updateLabelFieldSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required'),
  labelId: trelloIdSchema,
  field: z.enum(['name', 'color']),
  value: z.string().min(1, 'Field value is required')
});

export function validateCredentials(data: unknown) {
  return credentialsSchema.parse(data);
}

export function validateListBoards(data: unknown) {
  return listBoardsSchema.parse(data);
}

export function validateGetBoard(data: unknown) {
  return getBoardSchema.parse(data);
}

export function validateGetBoardLists(data: unknown) {
  return getBoardListsSchema.parse(data);
}

export function validateCreateCard(data: unknown) {
  return createCardSchema.parse(data);
}

export function validateUpdateCard(data: unknown) {
  return updateCardSchema.parse(data);
}

export function validateMoveCard(data: unknown) {
  return moveCardSchema.parse(data);
}

export function validateGetCard(data: unknown) {
  return getCardSchema.parse(data);
}

export function validateDeleteCard(data: unknown) {
  return deleteCardSchema.parse(data);
}

export function validateAddAttachmentToCard(data: unknown) {
  return addAttachmentToCardSchema.parse(data);
}

export function validateDeleteAttachmentFromCard(data: unknown) {
  return deleteAttachmentFromCardSchema.parse(data);
}

export function validateCreateChecklistOnCard(data: unknown) {
  return createChecklistOnCardSchema.parse(data);
}

export function validateUpdateCheckItem(data: unknown) {
  return updateCheckItemSchema.parse(data);
}

export function validateDeleteCheckItem(data: unknown) {
  return deleteCheckItemSchema.parse(data);
}

export function validateAddLabelToCard(data: unknown) {
  return addLabelToCardSchema.parse(data);
}

export function validateRemoveLabelFromCard(data: unknown) {
  return removeLabelFromCardSchema.parse(data);
}

export function validateAddMemberToCard(data: unknown) {
  return addMemberToCardSchema.parse(data);
}

export function validateRemoveMemberFromCard(data: unknown) {
  return removeMemberFromCardSchema.parse(data);
}

export function validateArchiveCard(data: unknown) {
  return archiveCardSchema.parse(data);
}

export function validateCreateLabel(data: unknown) {
  return createLabelSchema.parse(data);
}

export function validateGetLabel(data: unknown) {
  return getLabelSchema.parse(data);
}

export function validateUpdateLabel(data: unknown) {
  return updateLabelSchema.parse(data);
}

export function validateDeleteLabel(data: unknown) {
  return deleteLabelSchema.parse(data);
}

export function validateUpdateLabelField(data: unknown) {
  return updateLabelFieldSchema.parse(data);
}

export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return `Validation error: ${issues.join(', ')}`;
}