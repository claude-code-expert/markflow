import { pgTable, bigserial, bigint, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const workspaceMembers = pgTable('workspace_members', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().$type<'owner' | 'admin' | 'editor' | 'viewer'>(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_workspace_member').on(table.workspaceId, table.userId),
]);
