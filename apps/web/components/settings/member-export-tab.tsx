'use client';

import { useState } from 'react';
import { useToastStore } from '../../stores/toast-store';

const EXPORT_OPTIONS = [
  { id: 'members-csv', icon: '📊', color: 'var(--green-lt)', title: '멤버 목록 CSV', desc: '이름, 이메일, 역할, 가입일 포함' },
  { id: 'permissions-csv', icon: '🔒', color: 'var(--accent-2)', title: '권한 현황 CSV', desc: '멤버별 역할 및 권한 범위' },
  { id: 'activity-csv', icon: '📋', color: 'var(--amber-lt)', title: '활동 내역 CSV', desc: '문서 수정, 로그인, 권한 변경 이력' },
  { id: 'report-pdf', icon: '📑', color: 'var(--purple-lt)', title: '전체 보고서 PDF', desc: '멤버 + 권한 + 활동 종합 리포트' },
] as const;

export function MemberExportTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0] ?? '');

  const handleExport = (optionId: string) => {
    addToast({ message: `${optionId} 다운로드 시작...`, type: 'success' });
  };

  return (
    <div>
      <p style={{ fontSize: '13.5px', color: 'var(--text-2)', marginBottom: '24px' }}>
        멤버 목록, 권한 현황, 활동 내역을 내보냅니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '560px' }}>
        {EXPORT_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            onClick={() => handleExport(opt.id)}
            style={{
              padding: '24px', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', background: 'var(--bg)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: 'var(--radius)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px', fontSize: '18px', background: opt.color,
            }}>
              {opt.icon}
            </div>
            <div style={{ fontFamily: 'var(--font-h)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{opt.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{opt.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', maxWidth: '560px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>
          기간 필터
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              flex: 1, padding: '10px 13px', borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
            }}
          />
          <span style={{ color: 'var(--text-3)' }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              flex: 1, padding: '10px 13px', borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
