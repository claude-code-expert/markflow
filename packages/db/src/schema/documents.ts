import { pgTable, bigserial, bigint, varchar, text, integer, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { categories } from './categories';
import { users } from './users';

export const documents = pgTable('documents', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  categoryId: bigint('category_id', { mode: 'number' }).references(() => categories.id, { onDelete: 'set null' }),
  authorId: bigint('author_id', { mode: 'number' }).notNull().references(() => users.id),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull().default(''),
  currentVersion: integer('current_version').notNull().default(1),
  // 'draft' = 작성자만 볼 수 있는 임시저장 상태, 'published' = 일반 공개 상태
  status: varchar('status', { length: 20 }).notNull().default('published'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_documents_active').on(table.workspaceId, table.categoryId, table.updatedAt)
    .where(sql`NOT is_deleted`),
  index('idx_documents_deleted').on(table.workspaceId, table.deletedAt)
    .where(sql`is_deleted`),
]);

export const documentVersions = pgTable('document_versions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  documentId: bigint('document_id', { mode: 'number' }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  authorId: bigint('author_id', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_document_version').on(table.documentId, table.version),
]);
