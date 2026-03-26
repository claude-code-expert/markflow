import { pgTable, uuid, varchar, integer, timestamp, unique, index, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_category_name_parent').on(table.workspaceId, table.parentId, table.name),
]);

export const categoryClosure = pgTable('category_closure', {
  ancestorId: uuid('ancestor_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  descendantId: uuid('descendant_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  depth: integer('depth').notNull(),
}, (table) => [
  primaryKey({ columns: [table.ancestorId, table.descendantId] }),
  index('idx_closure_ancestor').on(table.ancestorId),
  index('idx_closure_descendant').on(table.descendantId),
]);
