import { pgTable, uuid, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { documents } from './documents';

export const documentRelations = pgTable('document_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).$type<'prev' | 'next' | 'related'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_document_relation').on(table.sourceId, table.targetId, table.type),
  index('idx_document_relations_source').on(table.sourceId),
  index('idx_document_relations_target').on(table.targetId),
]);
