'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import { MessageSquare, Send, Trash2, Reply, X, Pencil, Check, CheckCircle } from 'lucide-react';
import { formatKstRelativeLong } from '../lib/date';

interface Comment {
  id: number;
  documentId: number;
  authorId: number;
  authorName: string;
  content: string;
  parentId: number | null;
  resolved: boolean;
  resolvedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CommentsResponse {
  comments: Comment[];
}

interface CommentResponse {
  comment: Comment;
}

interface CommentPanelProps {
  workspaceId: number;
  documentId: string;
  onClose: () => void;
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onEdit,
  onToggleResolved,
  replies,
  depth,
}: {
  comment: Comment;
  currentUserId: number | null;
  onDelete: (id: number) => void;
  onReply: (id: number) => void;
  onEdit: (id: number, content: string) => void;
  onToggleResolved: (id: number) => void;
  replies: Comment[];
  depth: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  function handleEditSubmit() {
    if (!editContent.trim()) return;
    onEdit(comment.id, editContent.trim());
    setIsEditing(false);
  }

  const actionBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          background: depth > 0 ? 'var(--surface-2)' : 'transparent',
          opacity: comment.resolved ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: comment.resolved ? 'var(--text-3)' : 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {comment.resolved ? <Check size={12} /> : comment.authorName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textDecoration: comment.resolved ? 'line-through' : 'none' }}>
            {comment.authorName}
          </span>
          {comment.resolved && (
            <span style={{ fontSize: '10px', color: 'var(--green, #38a169)', fontWeight: 500 }}>
              해결됨
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: 'auto' }}>
            {formatKstRelativeLong(comment.createdAt)}
          </span>
        </div>

        {isEditing ? (
          <div style={{ paddingLeft: '32px' }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleEditSubmit();
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '13px',
                resize: 'none',
                minHeight: '50px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleEditSubmit}
                style={{ ...actionBtnStyle, color: 'var(--accent)' }}
              >
                <Check size={12} />
                저장
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                style={{ ...actionBtnStyle, color: 'var(--text-3)' }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, paddingLeft: '32px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {comment.content}
          </div>
        )}

        {!isEditing && (
          <div style={{ display: 'flex', gap: '4px', paddingLeft: '32px', marginTop: '6px' }}>
            {depth === 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onReply(comment.id)}
                  style={{ ...actionBtnStyle, color: 'var(--text-3)' }}
                >
                  <Reply size={12} />
                  답글
                </button>
                <button
                  type="button"
                  onClick={() => onToggleResolved(comment.id)}
                  style={{ ...actionBtnStyle, color: comment.resolved ? 'var(--accent)' : 'var(--green, #38a169)' }}
                >
                  <CheckCircle size={12} />
                  {comment.resolved ? '해제' : '해결'}
                </button>
              </>
            )}
            {currentUserId === comment.authorId && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setEditContent(comment.content); }}
                  style={{ ...actionBtnStyle, color: 'var(--text-3)' }}
                >
                  <Pencil size={12} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  style={{ ...actionBtnStyle, color: 'var(--red, #e53e3e)' }}
                >
                  <Trash2 size={12} />
                  삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          onDelete={onDelete}
          onReply={onReply}
          onEdit={onEdit}
          onToggleResolved={onToggleResolved}
          replies={[]}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function CommentPanel({ workspaceId, documentId, onClose }: CommentPanelProps) {
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const commentsQuery = useQuery({
    queryKey: ['comments', workspaceId, documentId],
    queryFn: () =>
      apiFetch<CommentsResponse>(
        `/workspaces/${workspaceId}/documents/${documentId}/comments`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: { content: string; parentId?: number }) =>
      apiFetch<CommentResponse>(
        `/workspaces/${workspaceId}/documents/${documentId}/comments`,
        { method: 'POST', body },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', workspaceId, documentId] });
      setNewContent('');
      setReplyTo(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      apiFetch<CommentResponse>(
        `/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
        { method: 'PATCH', body: { content } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', workspaceId, documentId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch<CommentResponse>(
        `/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
        { method: 'PATCH', body: { resolved: true } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', workspaceId, documentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch(
        `/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', workspaceId, documentId] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!newContent.trim()) return;
    const body: { content: string; parentId?: number } = { content: newContent.trim() };
    if (replyTo !== null) {
      body.parentId = replyTo;
    }
    createMutation.mutate(body);
  }, [newContent, replyTo, createMutation]);

  const handleEdit = useCallback((commentId: number, content: string) => {
    editMutation.mutate({ commentId, content });
  }, [editMutation]);

  const handleToggleResolved = useCallback((commentId: number) => {
    resolveMutation.mutate(commentId);
  }, [resolveMutation]);

  const handleDelete = useCallback((commentId: number) => {
    deleteMutation.mutate(commentId);
  }, [deleteMutation]);

  const handleReply = useCallback((parentId: number) => {
    setReplyTo(parentId);
  }, []);

  const allComments = commentsQuery.data?.comments ?? [];
  const topLevel = allComments.filter((c) => c.parentId === null);
  const repliesMap = new Map<number, Comment[]>();
  for (const c of allComments) {
    if (c.parentId !== null) {
      const existing = repliesMap.get(c.parentId) ?? [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }

  const replyToComment = replyTo !== null ? allComments.find((c) => c.id === replyTo) : undefined;

  return (
    <div
      style={{
        width: '320px',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <MessageSquare size={16} style={{ color: 'var(--text-2)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
          댓글
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '4px' }}>
          {allComments.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Comments list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {commentsQuery.isLoading && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-3)' }}>
            불러오는 중...
          </div>
        )}
        {!commentsQuery.isLoading && topLevel.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <MessageSquare size={32} style={{ color: 'var(--border-2)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              아직 댓글이 없습니다.
            </p>
          </div>
        )}
        {topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUser?.id ?? null}
            onDelete={handleDelete}
            onReply={handleReply}
            onEdit={handleEdit}
            onToggleResolved={handleToggleResolved}
            replies={repliesMap.get(comment.id) ?? []}
            depth={0}
          />
        ))}
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '12px',
          flexShrink: 0,
        }}
      >
        {replyToComment && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              color: 'var(--text-3)',
              padding: '6px 8px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Reply size={12} />
            <span style={{ fontWeight: 500 }}>{replyToComment.authorName}</span>
            <span>에게 답글</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="댓글을 입력하세요..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              resize: 'none',
              minHeight: '60px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newContent.trim() || createMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: newContent.trim() ? 'var(--accent)' : 'var(--surface-2)',
              color: newContent.trim() ? '#fff' : 'var(--text-3)',
              cursor: newContent.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              alignSelf: 'flex-end',
              transition: 'background 0.15s',
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
          Ctrl+Enter로 전송
        </div>
      </div>
    </div>
  );
}
