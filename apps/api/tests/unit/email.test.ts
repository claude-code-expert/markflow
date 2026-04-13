import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger before importing email module
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Ensure no RESEND_API_KEY is set (fallback mode)
delete process.env.RESEND_API_KEY;

describe('email utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail() fallback mode', () => {
    it('calls logger.info with [EMAIL FALLBACK] when RESEND_API_KEY is not set', async () => {
      const { sendEmail } = await import('../../src/utils/email.js');
      const { logger } = await import('../../src/utils/logger.js');

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL FALLBACK]'),
        undefined,
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
        undefined,
      );
    });

    it('does not throw when RESEND_API_KEY is not set', async () => {
      const { sendEmail } = await import('../../src/utils/email.js');

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Body</p>',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('verificationEmailHtml()', () => {
    it('returns HTML with the verify URL as href', async () => {
      const { verificationEmailHtml } = await import('../../src/utils/email.js');
      const url = 'https://app.markflow.app/verify-email?token=abc123';
      const html = verificationEmailHtml(url);

      expect(html).toContain(`href="${url}"`);
    });

    it('contains the CTA button text', async () => {
      const { verificationEmailHtml } = await import('../../src/utils/email.js');
      const html = verificationEmailHtml('https://example.com');

      expect(html).toContain('이메일 인증하기');
    });
  });

  describe('passwordResetEmailHtml()', () => {
    it('returns HTML with the reset URL as href', async () => {
      const { passwordResetEmailHtml } = await import('../../src/utils/email.js');
      const url = 'https://app.markflow.app/reset-password?token=xyz789';
      const html = passwordResetEmailHtml(url);

      expect(html).toContain(`href="${url}"`);
    });

    it('contains the CTA button text', async () => {
      const { passwordResetEmailHtml } = await import('../../src/utils/email.js');
      const html = passwordResetEmailHtml('https://example.com');

      expect(html).toContain('비밀번호 재설정하기');
    });
  });

  describe('invitationEmailHtml()', () => {
    it('returns HTML with workspace name and inviter name', async () => {
      const { invitationEmailHtml } = await import('../../src/utils/email.js');
      const html = invitationEmailHtml(
        'https://app.markflow.app/invitations/token123',
        'My Workspace',
        'John Doe',
      );

      expect(html).toContain('My Workspace');
      expect(html).toContain('John Doe');
    });

    it('contains the CTA button text', async () => {
      const { invitationEmailHtml } = await import('../../src/utils/email.js');
      const html = invitationEmailHtml('https://example.com', 'WS', 'User');

      expect(html).toContain('초대 수락하기');
    });
  });

  describe('XSS prevention', () => {
    it('escapes HTML special characters in workspaceName', async () => {
      const { invitationEmailHtml } = await import('../../src/utils/email.js');
      const html = invitationEmailHtml(
        'https://example.com',
        '<script>alert(1)</script>',
        'Safe User',
      );

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes HTML special characters in inviterName', async () => {
      const { invitationEmailHtml } = await import('../../src/utils/email.js');
      const html = invitationEmailHtml(
        'https://example.com',
        'Safe Workspace',
        '<img onerror="alert(1)" src="x">',
      );

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });
});
