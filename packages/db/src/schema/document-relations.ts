import { pgTable, bigserial, bigint, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { documents } from './documents';

export const documentRelations = pgTable('document_relations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sourceId: bigint('source_id', { mode: 'number' }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  targetId: bigint('target_id', { mode: 'number' }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).$type<'prev' | 'next' | 'related'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_document_relation').on(table.sourceId, table.targetId, table.type),
  index('idx_document_relations_source').on(table.sourceId),
  index('idx_document_relations_target').on(table.targetId),
]);
