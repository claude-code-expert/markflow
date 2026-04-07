import { pgTable, bigserial, bigint, text, timestamp, boolean, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { documents } from './documents';
import { users } from './users';

export const comments = pgTable('comments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  documentId: bigint('document_id', { mode: 'number' }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  authorId: bigint('author_id', { mode: 'number' }).notNull().references(() => users.id),
  content: text('content').notNull(),
  parentId: bigint('parent_id', { mode: 'number' }).references((): AnyPgColumn => comments.id),
  resolved: boolean('resolved').notNull().default(false),
  resolvedBy: bigint('resolved_by', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_comments_document').on(table.documentId),
]);
