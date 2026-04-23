import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Schema exports
export { users } from './schema/users';
export { workspaces } from './schema/workspaces';
export { workspaceMembers } from './schema/workspace-members';
export { refreshTokens } from './schema/refresh-tokens';
export { invitations } from './schema/invitations';
export { joinRequests } from './schema/join-requests';
export { categories, categoryClosure } from './schema/categories';
export { documents, documentVersions } from './schema/documents';
export { documentRelations } from './schema/document-relations';
export { tags, documentTags } from './schema/tags';
export { embedTokens } from './schema/embed-tokens';
export { comments } from './schema/comments';

// Re-export drizzle utilities consumers may need
export { eq, and, or, desc, asc, sql, isNull, gt, lt, gte, lte, ne, like, ilike, inArray, notInArray, count } from 'drizzle-orm';

// DB connection factory
export function createDb(databaseUrl: string, options?: { max?: number; idle_timeout?: number }) {
  const client = postgres(databaseUrl, {
    max: options?.max ?? 10,
    idle_timeout: options?.idle_timeout ?? 20,
  });
  return drizzle(client);
}

export type Db = ReturnType<typeof createDb>;
