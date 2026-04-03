import { pgTable, bigserial, bigint, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';

export const workspaces = pgTable('workspaces', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isRoot: boolean('is_root').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(true),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull().references(() => users.id),
  themePreset: varchar('theme_preset', { length: 20 }).notNull().default('default'),
  themeCss: text('theme_css').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
