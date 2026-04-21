// ─── Image Upload Guide Modal ────────────────────────────────────────────────
// Shown when a user clicks the image upload button without a configured Worker URL.
// Explains why setup is needed and guides them to settings.

import React from 'react'
import { CloudUpload, Settings, ExternalLink, HelpCircle } from 'lucide-react'

interface ImageUploadGuideProps {
  isOpen: boolean
  onClose: () => void
  onGoToSettings: () => void
}

export const ImageUploadGuide = React.memo(function ImageUploadGuide({ isOpen, onClose, onGoToSettings }: ImageUploadGuideProps) {
  if (!isOpen) return null

  return (
    <div className="mf-modal-overlay" onClick={onClose}>
      <div className="mf-modal mf-guide-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mf-guide-header">
          <CloudUpload size={24} className="mf-guide-header-icon" />
          <h3 className="mf-modal-title">이미지 업로드 설정이 필요합니다</h3>
        </div>

        <p className="mf-modal-desc" style={{ marginBottom: 20 }}>
          이미지를 에디터에 직접 업로드하려면 먼저 업로드 서버를 연결해야 합니다.
          설정은 한 번만 하면 됩니다.
        </p>

        {/* Steps */}
        <div className="mf-guide-steps">
          <div className="mf-guide-step">
            <span className="mf-guide-step-num">1</span>
            <div className="mf-guide-step-content">
              <strong>Cloudflare 가입</strong>
              <span className="mf-guide-step-desc">
                무료 계정 생성 →{' '}
                <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer">
                  cloudflare.com <ExternalLink size={10} />
                </a>
              </span>
            </div>
          </div>

          <div className="mf-guide-step">
            <span className="mf-guide-step-num">2</span>
            <div className="mf-guide-step-content">
              <strong>R2 버킷 + Worker 배포</strong>
              <span className="mf-guide-step-desc">
                에디터에 포함된 Worker 코드를 배포합니다. (5분 소요)
              </span>
            </div>
          </div>

          <div className="mf-guide-step">
            <span className="mf-guide-step-num">3</span>
            <div className="mf-guide-step-content">
              <strong>업로드 서버 URL 입력</strong>
              <span className="mf-guide-step-desc">
                배포 후 받은 URL을 설정에 붙여넣으면 완료!
              </span>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="mf-guide-info">
          <HelpCircle size={14} />
          <span>
            Cloudflare R2는 매월 10GB 저장 / 1,000만 회 읽기가 무료입니다.
            자세한 배포 방법은{' '}
            <a
              href="https://github.com/user/markflow-editor/tree/main/packages/editor/worker"
              target="_blank"
              rel="noopener noreferrer"
            >
              배포 가이드
            </a>
            를 참고하세요.
          </span>
        </div>

        {/* Actions */}
        <div className="mf-modal-actions" style={{ marginTop: 24 }}>
          <button className="mf-modal-btn mf-modal-btn-secondary" onClick={onClose}>
            나중에
          </button>
          <button className="mf-modal-btn mf-modal-btn-primary" onClick={onGoToSettings}>
            <Settings size={14} />
            설정하기
          </button>
        </div>
      </div>
    </div>
  )
})
