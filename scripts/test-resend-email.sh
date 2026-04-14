#!/usr/bin/env bash
# ──────────────────────────────────────────────
# test-resend-email.sh
# Resend SDK로 가입 인증(verification) 이메일을 실제 발송하는 테스트 스크립트
#
# Usage:
#   ./scripts/test-resend-email.sh [recipient_email]
#
# 기본값: brewnet.dev@gmail.com
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 1. .env.local에서 환경변수 로드 ──
ENV_FILE="$PROJECT_ROOT/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env.local 파일이 없습니다: $ENV_FILE"
  exit 1
fi

# .env.local에서 RESEND_API_KEY 추출 (export/quotes 처리)
RESEND_API_KEY=$(grep -E '^RESEND_API_KEY=' "$ENV_FILE" | sed 's/^RESEND_API_KEY=//' | sed 's/^["'"'"']//;s/["'"'"']$//' | tr -d '[:space:]')
EMAIL_FROM=$(grep -E '^EMAIL_FROM=' "$ENV_FILE" | sed 's/^EMAIL_FROM=//' | sed 's/^["'"'"']//;s/["'"'"']$//' || echo "")
FRONTEND_URL=$(grep -E '^FRONTEND_URL=' "$ENV_FILE" | sed 's/^FRONTEND_URL=//' | sed 's/^["'"'"']//;s/["'"'"']$//' || echo "")

if [[ -z "$RESEND_API_KEY" ]]; then
  echo "❌ RESEND_API_KEY가 .env.local에 설정되어 있지 않습니다."
  echo "   .env.local에 다음을 추가하세요:"
  echo "   RESEND_API_KEY=re_xxxxxxxxxx"
  exit 1
fi

# ── 2. 기본값 설정 ──
TO_EMAIL="${1:-brewnet.dev@gmail.com}"
# 도메인 미인증 시 Resend 기본 발신자 사용
if [[ "$EMAIL_FROM" == *"markflow.app"* ]] || [[ -z "$EMAIL_FROM" ]]; then
  EMAIL_FROM="MarkFlow Test <onboarding@resend.dev>"
  echo "ℹ️  markflow.app 도메인 미인증 — Resend 기본 발신자 사용: $EMAIL_FROM"
fi
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
FAKE_TOKEN="test-$(date +%s)-$(openssl rand -hex 8)"
VERIFY_URL="${FRONTEND_URL}/auth/verify-email?token=${FAKE_TOKEN}"

echo "───────────────────────────────────────"
echo "📧 Resend 이메일 발송 테스트"
echo "───────────────────────────────────────"
echo "  To:      $TO_EMAIL"
echo "  From:    $EMAIL_FROM"
echo "  Subject: [MarkFlow] 이메일 인증 (테스트)"
echo "  Token:   $FAKE_TOKEN"
echo "  URL:     $VERIFY_URL"
echo "───────────────────────────────────────"
echo ""

# ── 3. Node.js 인라인 스크립트로 Resend SDK 사용하여 발송 ──
cd "$PROJECT_ROOT"

node --input-type=module <<SCRIPT
import { Resend } from 'resend';

const resend = new Resend('${RESEND_API_KEY}');

const verifyUrl = '${VERIFY_URL}';
const html = \`<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 16px;">이메일 인증</h2>
  <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">MarkFlow에 가입해주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
  <a href="\${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #1a56db; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">이메일 인증하기</a>
  <p style="color: #888888; font-size: 12px; margin-top: 24px;">이 링크는 24시간 동안 유효합니다.</p>
  <p style="color: #bbbbbb; font-size: 11px; margin-top: 12px;">⚠️ 이 메일은 테스트 발송입니다. 실제 인증 토큰이 아닙니다.</p>
</div>\`;

try {
  const { data, error } = await resend.emails.send({
    from: '${EMAIL_FROM}',
    to: ['${TO_EMAIL}'],
    subject: '[MarkFlow] 이메일 인증 (테스트)',
    html,
  });

  if (error) {
    console.error('❌ 발송 실패:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('✅ 발송 성공!');
  console.log('  Email ID:', data?.id);
  console.log('');
  console.log('📬 ' + '${TO_EMAIL}' + ' 메일함을 확인하세요.');
} catch (err) {
  console.error('❌ 에러 발생:', err.message);
  process.exit(1);
}
SCRIPT

echo ""
echo "───────────────────────────────────────"
echo "✅ 테스트 완료"
echo "───────────────────────────────────────"
