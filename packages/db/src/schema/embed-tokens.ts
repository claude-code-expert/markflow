import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const embedTokens = pgTable('embed_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  label: varchar('label', { length: 100 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  scope: varchar('scope', { length: 20 }).notNull().$type<'read' | 'read_write'>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_embed_tokens_workspace').on(table.workspaceId),
]);
