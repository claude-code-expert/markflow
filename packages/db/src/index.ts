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

// Re-export drizzle utilities consumers may need
export { eq, and, or, desc, asc, sql, isNull, gt, lt, gte, lte, ne, like, ilike, inArray, notInArray, count } from 'drizzle-orm';

// DB connection factory
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client);
}

export type Db = ReturnType<typeof createDb>;
