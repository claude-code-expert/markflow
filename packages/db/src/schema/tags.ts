import { pgTable, uuid, varchar, unique, index, primaryKey } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { documents } from './documents';

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
}, (table) => [
  unique('uq_tag_workspace_name').on(table.workspaceId, table.name),
]);

export const documentTags = pgTable('document_tags', {
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.documentId, table.tagId] }),
  index('idx_document_tags_document').on(table.documentId),
  index('idx_document_tags_tag').on(table.tagId),
]);
