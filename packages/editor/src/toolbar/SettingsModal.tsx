// ─── Settings Modal — Cloudflare R2 Worker Configuration ──────────────────────

import React, { useState, useEffect, useCallback } from 'react'
import { createCloudflareUploader, createTestImage } from '../utils/cloudflareUploader'

const STORAGE_KEY = 'mf-cf-worker-url'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (workerUrl: string) => void
}

export const SettingsModal = React.memo(function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [workerUrl, setWorkerUrl] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY) ?? ''
      setWorkerUrl(saved)
      setTestStatus('idle')
      setTestMessage('')
    }
  }, [isOpen])

  const handleTest = useCallback(async () => {
    const trimmed = workerUrl.trim()
    if (!trimmed) return

    setTestStatus('testing')
    setTestMessage('')

    try {
      const uploader = createCloudflareUploader(trimmed)
      const testFile = createTestImage()
      const url = await uploader(testFile)
      setTestStatus('success')
      setTestMessage(url)
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [workerUrl])

  const handleSave = useCallback(() => {
    const trimmed = workerUrl.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
      onSave(trimmed)
      setTestMessage('Settings saved.')
      setTimeout(onClose, 800)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      onSave('')
      setTestMessage('업로드 서버 URL이 삭제되었습니다.')
      setTimeout(onClose, 800)
    }
  }, [workerUrl, onSave, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && testStatus === 'success') handleSave()
      if (e.key === 'Escape') onClose()
    },
    [handleSave, onClose, testStatus],
  )

  if (!isOpen) return null

  const urlTrimmed = workerUrl.trim()
  const canTest = urlTrimmed.length > 0 && testStatus !== 'testing'
  const canSave = urlTrimmed.length === 0 || testStatus === 'success'

  return (
    <div className="mf-modal-overlay" onClick={onClose}>
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="mf-modal-title">이미지 업로드 설정</h3>
        <p className="mf-modal-desc">
          이미지를 Cloudflare R2에 저장합니다. 업로드 서버를 배포하고 URL을 입력하세요.
        </p>

        <label className="mf-modal-label" htmlFor="mf-worker-input">
          업로드 서버 URL
        </label>
        <input
          id="mf-worker-input"
          type="url"
          className="mf-modal-input"
          placeholder="https://markflow-r2-uploader.your-name.workers.dev"
          value={workerUrl}
          onChange={(e) => {
            setWorkerUrl(e.target.value)
            setTestStatus('idle')
            setTestMessage('')
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <p className="mf-modal-hint">
          아직 서버가 없으신가요?{' '}
          <a
            href="https://github.com/user/markflow-editor/tree/main/packages/editor/worker"
            target="_blank"
            rel="noopener noreferrer"
          >
            배포 가이드
          </a>
          를 참고하세요. (5분 소요, 무료)
        </p>

        {/* Test Upload Button */}
        <button
          className={`mf-modal-test-btn ${testStatus === 'testing' ? 'mf-modal-test-btn-loading' : ''}`}
          onClick={handleTest}
          disabled={!canTest}
        >
          {testStatus === 'testing' ? '테스트 중...' : '테스트 업로드'}
        </button>

        {/* Status Messages */}
        {testStatus === 'success' && (
          <div className="mf-modal-status mf-modal-status-success">
            <span className="mf-modal-badge">✅ 연동 완료</span>
            <span className="mf-modal-test-url">{testMessage}</span>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="mf-modal-status mf-modal-status-error">
            <span className="mf-modal-badge">❌ 연결 실패</span>
            <span className="mf-modal-test-url">{testMessage}</span>
          </div>
        )}

        <div className="mf-modal-actions">
          <button className="mf-modal-btn mf-modal-btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            className="mf-modal-btn mf-modal-btn-primary"
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
})

/** Load saved Cloudflare Worker URL from localStorage */
export function getSavedWorkerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
