'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Upload, FileText, Globe, FolderOpen, FileDown, Crown, Folder,
} from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useToastStore } from '../stores/toast-store';
import type { Category as TreeCategory, TreeDocument } from './category-tree';
import { flattenCategories, collectAllDocs, type FlatCategory, type FlatDocument } from '../lib/category-utils';

type ImportFormat = 'md' | 'html';
type ExportFormat = 'md' | 'html' | 'pdf';
type ExportScope = 'document' | 'category';

interface ImportExportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
  workspaceSlug: string;
  currentDocId?: number;
  currentCategoryId?: number;
}

interface CategoryTreeResponse {
  categories: TreeCategory[];
  uncategorized: TreeDocument[];
}

export function ImportExportModal({
  open, onClose, workspaceId, workspaceSlug,
  currentDocId, currentCategoryId,
}: ImportExportModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [importFormat, setImportFormat] = useState<ImportFormat>('md');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('md');
  const [exportScope, setExportScope] = useState<ExportScope>('document');
  const [selectedDocId, setSelectedDocId] = useState<string>(currentDocId ? String(currentDocId) : '');
  const [selectedCatId, setSelectedCatId] = useState<string>(currentCategoryId ? String(currentCategoryId) : '');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [flatCats, setFlatCats] = useState<FlatCategory[]>([]);
  const [allDocs, setAllDocs] = useState<FlatDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  useEffect(() => {
    if (!open) return;
    apiFetch<CategoryTreeResponse>(`/workspaces/${workspaceId}/categories/tree`)
      .then((res) => {
        setFlatCats(flattenCategories(res.categories));
        setAllDocs(collectAllDocs(res.categories, res.uncategorized));
      })
      .catch(() => { setFlatCats([]); setAllDocs([]); });
  }, [open, workspaceId]);

  // 모달 열릴 때 초기값 설정
  useEffect(() => {
    if (!open) return;
    setSelectedDocId(currentDocId ? String(currentDocId) : '');
    setSelectedCatId(currentCategoryId ? String(currentCategoryId) : '');
    setExportScope(currentDocId ? 'document' : 'category');
  }, [open, currentDocId, currentCategoryId]);

  const handleImport = useCallback(async (file: File) => {
    if (processing) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const qs = targetCategoryId ? `?categoryId=${encodeURIComponent(targetCategoryId)}` : '';
      await apiFetch(`/workspaces/${workspaceId}/import${qs}`, {
        method: 'POST',
        body: formData,
      });
      addToast({ message: `${file.name} 가져오기 완료`, type: 'success' });
      onClose();
    } catch (err) {
      const detail = err instanceof ApiError
        ? `${err.message} (${err.code})`
        : err instanceof TypeError && err.message.includes('fetch')
          ? 'API 서버에 연결할 수 없습니다'
          : err instanceof Error ? err.message : '알 수 없는 오류';
      addToast({ message: `가져오기 실패: ${detail}`, type: 'error' });
    } finally {
      setProcessing(false);
    }
  }, [processing, targetCategoryId, workspaceId, addToast, onClose]);

  const handleExport = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      let url = '';
      let defaultFilename = 'export';

      if (exportScope === 'document' && selectedDocId) {
        const formatParam = exportFormat !== 'md' ? `?format=${exportFormat}` : '';
        url = `${API_BASE}/workspaces/${workspaceId}/documents/${selectedDocId}/export${formatParam}`;
        const ext = exportFormat === 'html' ? '.html' : exportFormat === 'pdf' ? '.pdf' : '.md';
        const docName = allDocs.find((d) => String(d.id) === selectedDocId)?.title ?? 'document';
        defaultFilename = `${docName}${ext}`;
      } else if (exportScope === 'category' && selectedCatId) {
        url = `${API_BASE}/workspaces/${workspaceId}/categories/${selectedCatId}/export`;
        const catName = flatCats.find((c) => String(c.id) === selectedCatId)?.path ?? 'category';
        defaultFilename = `${catName}.zip`;
      }

      if (!url) {
        addToast({ message: '내보낼 대상을 선택해주세요', type: 'error' });
        return;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : defaultFilename;

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      addToast({ message: '내보내기 완료', type: 'success' });
      onClose();
    } catch (err) {
      const detail = err instanceof TypeError && err.message.includes('fetch')
        ? 'API 서버에 연결할 수 없습니다'
        : err instanceof Error ? err.message : '알 수 없는 오류';
      addToast({ message: `내보내기 실패: ${detail}`, type: 'error' });
    } finally {
      setProcessing(false);
    }
  }, [processing, exportScope, exportFormat, selectedDocId, selectedCatId, workspaceId, addToast, onClose]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleImport(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImport(file);
  };

  const acceptExt = importFormat === 'md' ? '.md' : '.html,.htm';
  const canExport = (exportScope === 'document' && selectedDocId) || (exportScope === 'category' && selectedCatId);

  if (!open) return null;

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 30px 10px 12px', fontSize: '14px',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ padding: 0, maxWidth: '720px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
            가져오기 / 내보내기
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            {(['import', 'export'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', fontSize: '14px', fontWeight: 500,
                  border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: '-1px', background: 'none', cursor: 'pointer',
                  color: tab === t ? 'var(--accent)' : 'var(--text-3)',
                  transition: 'color 0.15s',
                }}
              >
                {t === 'import' ? <Download size={14} /> : <Upload size={14} />}
                {t === 'import' ? '가져오기' : '내보내기'}
              </button>
            ))}
          </div>

          {/* ── Import Tab ── */}
          {tab === 'import' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {([
                  ['md', 'Markdown 파일 (.md)', '단일 .md 파일을 가져옵니다'],
                  ['html', 'HTML 파일 (.html)', 'HTML을 Markdown으로 변환하여 가져옵니다'],
                ] as const).map(([fmt, title, desc], i) => (
                  <div
                    key={fmt}
                    onClick={() => setImportFormat(fmt)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      padding: '14px 16px', borderRadius: 'var(--radius)',
                      border: `1.5px solid ${importFormat === fmt ? 'var(--accent)' : 'transparent'}`,
                      background: importFormat === fmt ? 'var(--accent-2)' : 'var(--surface-2)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700,
                      background: importFormat === fmt ? 'var(--accent)' : 'var(--surface)',
                      color: importFormat === fmt ? '#fff' : 'var(--text-3)',
                      border: importFormat === fmt ? 'none' : '1.5px solid var(--border)',
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Target folder */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>
                  대상 폴더
                </label>
                <select value={targetCategoryId} onChange={(e) => setTargetCategoryId(e.target.value)} style={selectStyle}>
                  <option value="">미분류 (폴더 없음)</option>
                  {flatCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.path}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-2)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: isDragging ? 'var(--accent-2)' : 'transparent',
                  color: isDragging ? 'var(--accent)' : 'var(--text-3)',
                }}
              >
                <FolderOpen size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>파일을 여기에 드래그하거나</div>
                <button type="button" style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 500,
                  background: 'var(--surface)', color: 'var(--text-2)',
                  border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}>
                  파일 선택
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px' }}>
                  지원 형식: {importFormat === 'md' ? '.md' : '.html, .htm'} · 최대 50MB
                </div>
                <input ref={fileInputRef} type="file" accept={acceptExt} onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>
            </div>
          )}

          {/* ── Export Tab ── */}
          {tab === 'export' && (
            <div>
              {/* Step 1: Format */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px',
                }}>
                  1. 형식 선택
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {([
                    { id: 'md' as const, icon: <FileText size={20} />, title: 'Markdown', desc: '.md 파일로 다운로드' },
                    { id: 'html' as const, icon: <Globe size={20} />, title: 'HTML', desc: '렌더링된 HTML + CSS 포함' },
                    { id: 'pdf' as const, icon: <FileDown size={20} />, title: 'PDF', desc: '인쇄용 PDF 생성', badge: 'Pro' },
                  ]).map((fmt) => (
                    <div
                      key={fmt.id}
                      onClick={() => { if (fmt.id !== 'pdf') setExportFormat(fmt.id); }}
                      style={{
                        padding: '16px 14px', borderRadius: 'var(--radius)',
                        border: `1.5px solid ${exportFormat === fmt.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: exportFormat === fmt.id ? 'var(--accent-2)' : 'var(--bg)',
                        cursor: fmt.id === 'pdf' ? 'not-allowed' : 'pointer',
                        opacity: fmt.id === 'pdf' ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ color: exportFormat === fmt.id ? 'var(--accent)' : 'var(--text-2)', marginBottom: '6px' }}>
                        {fmt.icon}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                        {fmt.title}
                        {fmt.badge && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            marginLeft: '6px', padding: '1px 6px', fontSize: '10px', fontWeight: 600,
                            background: 'var(--purple-lt)', color: 'var(--purple)', borderRadius: '100px',
                          }}>
                            <Crown size={9} /> {fmt.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fmt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Scope */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px',
                }}>
                  2. 범위 선택
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {([
                    { id: 'document' as const, icon: <FileText size={16} />, label: '문서 단위' },
                    { id: 'category' as const, icon: <Folder size={16} />, label: '폴더 단위 (ZIP)' },
                  ]).map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setExportScope(scope.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '12px', borderRadius: 'var(--radius)',
                        border: `1.5px solid ${exportScope === scope.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: exportScope === scope.id ? 'var(--accent-2)' : 'var(--bg)',
                        color: exportScope === scope.id ? 'var(--accent)' : 'var(--text-2)',
                        cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.15s',
                      }}
                    >
                      {scope.icon} {scope.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Target selection */}
              <div>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px',
                }}>
                  3. 대상 선택
                </div>
                {exportScope === 'document' ? (
                  <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} style={selectStyle}>
                    <option value="">문서를 선택하세요</option>
                    {allDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.title}</option>
                    ))}
                  </select>
                ) : (
                  <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} style={selectStyle}>
                    <option value="">폴더를 선택하세요</option>
                    {flatCats.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.path}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 24px', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', fontSize: '14px', fontWeight: 500,
              color: 'var(--text-2)', background: 'var(--surface)',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}
          >
            취소
          </button>
          {tab === 'export' && (
            <button
              onClick={() => void handleExport()}
              disabled={processing || !canExport}
              style={{
                padding: '9px 18px', fontSize: '14px', fontWeight: 500,
                color: '#fff', background: (processing || !canExport) ? 'var(--text-3)' : 'var(--accent)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: (processing || !canExport) ? 'not-allowed' : 'pointer',
                opacity: (processing || !canExport) ? 0.6 : 1,
              }}
            >
              {processing ? '처리 중...' : '내보내기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
