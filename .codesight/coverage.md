# Test Coverage

> **81%** of routes and models are covered by tests
> 60 test files found

## Covered Routes

- POST:/register
- POST:/login
- POST:/workspaces/:wsId/categories
- GET:/workspaces/:wsId/categories
- GET:/workspaces/:wsId/categories/tree
- PATCH:/workspaces/:wsId/categories/:id
- PUT:/workspaces/:wsId/categories/reorder
- DELETE:/workspaces/:wsId/categories/:id
- GET:/workspaces/:wsId/documents/:docId/comments
- POST:/workspaces/:wsId/documents/:docId/comments
- PATCH:/workspaces/:wsId/documents/:docId/comments/:commentId
- DELETE:/workspaces/:wsId/documents/:docId/comments/:commentId
- POST:/workspaces/:wsId/documents
- GET:/workspaces/:wsId/documents
- GET:/workspaces/:wsId/documents/:id
- PATCH:/workspaces/:wsId/documents/:id
- DELETE:/workspaces/:wsId/documents/:id
- POST:/workspaces/:id/embed-tokens
- GET:/workspaces/:id/embed-tokens
- DELETE:/workspaces/:id/embed-tokens/:tokenId
- GET:/workspaces/:wsId/graph
- POST:/workspaces/:id/invitations
- GET:/invitations/:token
- POST:/invitations/:token/accept
- POST:/workspaces/:id/join-requests
- GET:/workspaces/:id/join-requests
- PATCH:/workspaces/:id/join-requests/batch
- PATCH:/workspaces/:id/join-requests/:requestId
- PUT:/workspaces/:wsId/documents/:docId/relations
- GET:/workspaces/:wsId/documents/:docId/relations
- GET:/workspaces/:wsId/documents/:docId/tags
- PUT:/workspaces/:wsId/documents/:docId/tags
- GET:/workspaces/:wsId/tags
- GET:/workspaces/:id/theme
- PATCH:/workspaces/:id/theme
- GET:/workspaces/:wsId/trash
- POST:/workspaces/:wsId/trash/:docId/restore
- DELETE:/workspaces/:wsId/trash/:docId
- GET:/
- GET:/workspaces/public
- POST:/workspaces
- GET:/workspaces
- GET:/workspaces/:id
- PATCH:/workspaces/:id
- DELETE:/workspaces/:id
- POST:/workspaces/:id/transfer
- GET:/workspaces/:id/members
- PATCH:/workspaces/:id/members/:userId
- DELETE:/workspaces/:id/members/:userId

## Covered Models

- categories
- category_closure
- comments
- document_relations
- documents
- document_versions
- embed_tokens
- invitations
- join_requests
- refresh_tokens
- tags
- document_tags
- users
- workspace_members
- workspaces
