import { Resend } from 'resend';
import { logger } from './logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'MarkFlow <noreply@markflow.app>';
export const FRONTEND_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

// Singleton: null when API key is not set (fallback mode)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!resend) {
    logger.info(`[EMAIL FALLBACK] To: ${params.to}, Subject: ${params.subject}`);
    logger.info(`[EMAIL FALLBACK] Body: ${params.html}`);
    return;
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    logger.error(`Failed to send email to ${params.to}`, { error });
    throw new Error(`Email send failed: ${error.message}`);
  }

  logger.info(`Email sent to ${params.to}`, { id: data?.id });
}

export function verificationEmailHtml(verifyUrl: string): string {
  const safeUrl = escapeHtml(verifyUrl);
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 16px;">이메일 인증</h2>
  <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">MarkFlow에 가입해주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
  <a href="${safeUrl}" style="display: inline-block; padding: 12px 24px; background: #1a56db; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">이메일 인증하기</a>
  <p style="color: #888888; font-size: 12px; margin-top: 24px;">이 링크는 24시간 동안 유효합니다.</p>
</div>`;
}

export function passwordResetEmailHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 16px;">비밀번호 재설정</h2>
  <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">비밀번호 재설정이 요청되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
  <a href="${safeUrl}" style="display: inline-block; padding: 12px 24px; background: #1a56db; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">비밀번호 재설정하기</a>
  <p style="color: #888888; font-size: 12px; margin-top: 24px;">이 링크는 1시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
</div>`;
}

export function invitationEmailHtml(
  inviteUrl: string,
  workspaceName: string,
  inviterName: string,
): string {
  const safeName = escapeHtml(inviterName);
  const safeWorkspace = escapeHtml(workspaceName);

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 16px;">워크스페이스 초대</h2>
  <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">${safeName}님이 ${safeWorkspace} 워크스페이스에 초대했습니다. 아래 버튼을 클릭하여 참여해주세요.</p>
  <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #1a56db; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">초대 수락하기</a>
  <p style="color: #888888; font-size: 12px; margin-top: 24px;">이 초대는 7일 동안 유효합니다.</p>
</div>`;
}
