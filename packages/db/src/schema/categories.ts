import { pgTable, bigserial, bigint, varchar, integer, doublePrecision, timestamp, unique, index, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: bigint('parent_id', { mode: 'number' }).references((): AnyPgColumn => categories.id),
  orderIndex: doublePrecision('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_category_name_parent').on(table.workspaceId, table.parentId, table.name).nullsNotDistinct(),
]);

export const categoryClosure = pgTable('category_closure', {
  ancestorId: bigint('ancestor_id', { mode: 'number' }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  descendantId: bigint('descendant_id', { mode: 'number' }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  depth: integer('depth').notNull(),
}, (table) => [
  primaryKey({ columns: [table.ancestorId, table.descendantId] }),
  index('idx_closure_ancestor').on(table.ancestorId),
  index('idx_closure_descendant').on(table.descendantId),
]);
