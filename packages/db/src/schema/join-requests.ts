import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const joinRequests = pgTable('join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  assignedRole: varchar('assigned_role', { length: 20 }).$type<'admin' | 'editor' | 'viewer'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
