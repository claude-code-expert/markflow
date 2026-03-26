'use client';

import Link from 'next/link';

interface RelationDoc {
  id: string;
  title: string;
}

interface Relations {
  prev: RelationDoc | null;
  next: RelationDoc | null;
  related: RelationDoc[];
}

interface DAGPipelineNavProps {
  relations: Relations;
  workspaceSlug: string;
  currentTitle: string;
}

export function DAGPipelineNav({
  relations,
  workspaceSlug,
  currentTitle,
}: DAGPipelineNavProps) {
  const { prev, next, related } = relations;

  const hasPipeline = prev !== null || next !== null;
  const hasRelated = related.length > 0;

  if (!hasPipeline && !hasRelated) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50/50 px-6 py-3">
      {/* Pipeline Navigation */}
      {hasPipeline && (
        <div className="flex items-center justify-center gap-2">
          {/* Previous */}
          {prev ? (
            <Link
              href={`/${workspaceSlug}/docs/${prev.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="max-w-[120px] truncate">{prev.title}</span>
            </Link>
          ) : (
            <div className="w-[120px]" />
          )}

          {/* Current */}
          <div className="flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-1.5">
            <span className="max-w-[150px] truncate text-sm font-semibold text-blue-700">
              {currentTitle}
            </span>
          </div>

          {/* Next */}
          {next ? (
            <Link
              href={`/${workspaceSlug}/docs/${next.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="max-w-[120px] truncate">{next.title}</span>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ) : (
            <div className="w-[120px]" />
          )}
        </div>
      )}

      {/* Related Documents */}
      {hasRelated && (
        <div className={`flex flex-wrap items-center gap-2 ${hasPipeline ? 'mt-2 justify-center' : ''}`}>
          <span className="text-xs font-medium text-gray-500">
            관련 문서:
          </span>
          {related.map((doc) => (
            <Link
              key={doc.id}
              href={`/${workspaceSlug}/docs/${doc.id}`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {doc.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Relations, RelationDoc, DAGPipelineNavProps };
