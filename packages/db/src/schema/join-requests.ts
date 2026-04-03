import { pgTable, bigserial, bigint, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';

export const joinRequests = pgTable('join_requests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  reviewedBy: bigint('reviewed_by', { mode: 'number' }).references(() => users.id),
  assignedRole: varchar('assigned_role', { length: 20 }).$type<'admin' | 'editor' | 'viewer'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_join_requests_unique_pending')
    .on(table.workspaceId, table.userId)
    .where(sql`${table.status} = 'pending'`),
]);
