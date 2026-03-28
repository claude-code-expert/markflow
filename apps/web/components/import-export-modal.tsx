'use client';

import { useState, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { useToastStore } from '../stores/toast-store';

type ImportFormat = 'md' | 'zip';
type ExportFormat = 'md' | 'zip';
type ExportScope = 'document' | 'category' | 'workspace';

interface ImportExportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceSlug: string;
  currentDocId?: string;
  currentCategoryId?: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiFetch(`/workspaces/${workspaceId}/import`, {
        method: 'POST',
        body: formData,
      });
      addToast({ message: `${file.name} 가져오기 완료`, type: 'success' });
      onClose();
    } catch {
      addToast({ message: '가져오기에 실패했습니다', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    setProcessing(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      let url = '';
      if (exportScope === 'document' && currentDocId) {
        url = `${API_BASE}/workspaces/${workspaceId}/documents/${currentDocId}/export`;
      } else if (exportScope === 'category' && currentCategoryId) {
        url = `${API_BASE}/workspaces/${workspaceId}/categories/${currentCategoryId}/export`;
      } else {
        url = `${API_BASE}/workspaces/${workspaceId}/categories/root/export`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = exportScope === 'document' ? 'document.md' : `${workspaceSlug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      addToast({ message: '내보내기 완료', type: 'success' });
      onClose();
    } catch {
      addToast({ message: '내보내기에 실패했습니다', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

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

  const acceptExt = importFormat === 'md' ? '.md' : '.zip';

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/35 z-[1000] flex items-center justify-center p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-[var(--font-sora)] text-[17px] font-semibold">가져오기 / 내보내기</h2>
          <button onClick={onClose} className="text-[#9A9890] hover:text-[#1A1916]">✕</button>
        </div>

        <div className="px-6 py-4">
          {/* Tabs */}
          <div className="flex border-b border-[#E2E0D8] mb-5">
            <button
              onClick={() => setTab('import')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'import' ? 'text-[#1A56DB] border-[#1A56DB]' : 'text-[#9A9890] border-transparent hover:text-[#57564F]'
              }`}
            >
              📥 가져오기
            </button>
            <button
              onClick={() => setTab('export')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'export' ? 'text-[#1A56DB] border-[#1A56DB]' : 'text-[#9A9890] border-transparent hover:text-[#57564F]'
              }`}
            >
              📤 내보내기
            </button>
          </div>

          {/* Import Tab */}
          {tab === 'import' && (
            <div>
              <div className="space-y-2.5 mb-4">
                {([['md', 'Markdown 파일 (.md)', '단일 .md 파일을 현재 워크스페이스에 가져옵니다'], ['zip', 'ZIP 아카이브 (.zip)', '폴더 구조가 보존된 ZIP 파일을 일괄 가져옵니다']] as const).map(([fmt, title, desc]) => (
                  <div
                    key={fmt}
                    onClick={() => setImportFormat(fmt)}
                    className={`flex items-start gap-4 p-4 rounded-lg border-[1.5px] cursor-pointer transition-all ${
                      importFormat === fmt ? 'border-[#1A56DB] bg-[#EEF3FF]' : 'border-transparent bg-[#F1F0EC] hover:bg-white hover:border-[#CBC9C0]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                      importFormat === fmt ? 'bg-[#1A56DB] text-white' : 'bg-white border-[1.5px] border-[#E2E0D8]'
                    }`}>
                      {fmt === 'md' ? '1' : '2'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-xs text-[#9A9890] mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-[#1A56DB] bg-[#EEF3FF] text-[#1A56DB]' : 'border-[#CBC9C0] text-[#9A9890] hover:border-[#1A56DB] hover:bg-[#EEF3FF] hover:text-[#1A56DB]'
                }`}
              >
                <div className="text-2xl mb-2.5">📂</div>
                <div className="text-sm font-medium mb-1.5">파일을 여기에 드래그하거나</div>
                <button className="px-3 py-1.5 bg-white text-[#57564F] text-xs font-medium rounded border border-[#CBC9C0]">
                  파일 선택
                </button>
                <div className="text-[11px] text-[#9A9890] mt-2.5">
                  지원 형식: {acceptExt} · 최대 50MB
                </div>
                <input ref={fileInputRef} type="file" accept={acceptExt} onChange={handleFileSelect} className="hidden" />
              </div>
            </div>
          )}

          {/* Export Tab */}
          {tab === 'export' && (
            <div>
              <div className="grid grid-cols-2 gap-3.5 mb-4">
                {([['md', '📄', 'Markdown (.md)', '현재 문서를 .md 파일로 다운로드'], ['zip', '📦', 'ZIP 아카이브', '카테고리/폴더 구조 보존하여 일괄 내보내기']] as const).map(([fmt, icon, title, desc]) => (
                  <div
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === fmt ? 'border-[#1A56DB] bg-[#EEF3FF] shadow-sm' : 'border-[#E2E0D8] bg-[#F8F7F4] hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="text-xl mb-2">{icon}</div>
                    <div className="text-[15px] font-semibold mb-1">{title}</div>
                    <div className="text-xs text-[#9A9890]">{desc}</div>
                  </div>
                ))}
              </div>

              {/* Scope selection */}
              <div className="p-3.5 bg-[#F1F0EC] rounded-lg border border-[#E2E0D8]">
                <div className="text-[13px] font-medium mb-2">내보내기 범위 선택</div>
                <div className="flex gap-2.5 flex-wrap">
                  {([['document', '현재 문서만'], ['category', '현재 카테고리'], ['workspace', '전체 워크스페이스']] as const).map(([scope, label]) => (
                    <label key={scope} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input
                        type="radio"
                        name="export-scope"
                        checked={exportScope === scope}
                        onChange={() => setExportScope(scope)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#E2E0D8]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#57564F] bg-white border-[1.5px] border-[#CBC9C0] rounded-md hover:bg-[#F1F0EC]">
            취소
          </button>
          <button
            onClick={tab === 'export' ? handleExport : undefined}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1A56DB] rounded-md hover:bg-[#1343B0] disabled:opacity-50"
          >
            {processing ? '처리 중...' : '실행'}
          </button>
        </div>
      </div>
    </div>
  );
}
