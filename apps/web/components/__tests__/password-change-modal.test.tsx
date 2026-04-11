import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordChangeModal } from '../password-change-modal';

/* ---------- Mocks ---------- */

// Mock api module
const mockApiFetch = vi.fn();
const mockSetAccessToken = vi.fn();

vi.mock('../../lib/api', () => {
  class MockApiError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.statusCode = statusCode;
    }
  }
  return {
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
    ApiError: MockApiError,
    setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  };
});

// Mock toast store
const mockAddToast = vi.fn();
vi.mock('../../stores/toast-store', () => ({
  useToastStore: (selector: (state: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

/* ---------- Helpers ---------- */

function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    const currentPw = screen.getByLabelText('현재 비밀번호');
    const newPw = screen.getByLabelText('새 비밀번호');
    const confirmPw = screen.getByLabelText('새 비밀번호 확인');

    await user.type(currentPw, 'OldPass123!');
    await user.type(newPw, 'NewPass123!');
    await user.type(confirmPw, 'NewPass123!');
  };
}

/* ---------- Tests ---------- */

describe('PasswordChangeModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Rendering
  it('isOpen=true일 때 모달이 렌더링되고 필수 요소가 표시된다', () => {
    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    // Heading
    expect(screen.getByText('비밀번호 변경', { selector: 'h2' })).toBeTruthy();

    // Description
    expect(screen.getByText('보안을 위해 현재 비밀번호를 확인한 후 변경합니다.')).toBeTruthy();

    // 3 input fields
    expect(screen.getByLabelText('현재 비밀번호')).toBeTruthy();
    expect(screen.getByLabelText('새 비밀번호')).toBeTruthy();
    expect(screen.getByLabelText('새 비밀번호 확인')).toBeTruthy();

    // Submit button
    const submitBtn = screen.getByRole('button', { name: '비밀번호 변경' });
    expect(submitBtn).toBeTruthy();

    // Cancel button
    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
  });

  // Test 2: Closed state
  it('isOpen=false일 때 모달이 렌더링되지 않는다', () => {
    render(<PasswordChangeModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('비밀번호 변경')).toBeNull();
  });

  // Test 3: Hint pills
  it('새 비밀번호 입력 시 hint pills가 실시간으로 업데이트된다', async () => {
    const user = userEvent.setup();
    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    const newPwInput = screen.getByLabelText('새 비밀번호');

    // Type a single letter
    await user.type(newPwInput, 'a');

    // Only '영문 포함' should be passed
    const alphaHint = screen.getByTestId('hint-영문 포함');
    expect(alphaHint.getAttribute('data-passed')).toBe('true');

    const lengthHint = screen.getByTestId('hint-8자 이상');
    expect(lengthHint.getAttribute('data-passed')).toBe('false');

    // Clear and type a full valid password
    await user.clear(newPwInput);
    await user.type(newPwInput, 'Abc12345!');

    // All 4 pills should be passed
    expect(screen.getByTestId('hint-8자 이상').getAttribute('data-passed')).toBe('true');
    expect(screen.getByTestId('hint-영문 포함').getAttribute('data-passed')).toBe('true');
    expect(screen.getByTestId('hint-숫자 포함').getAttribute('data-passed')).toBe('true');
    expect(screen.getByTestId('hint-특수문자 포함').getAttribute('data-passed')).toBe('true');
  });

  // Test 4: Mismatch validation
  it('새 비밀번호와 확인이 불일치할 때 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup();
    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    const currentPw = screen.getByLabelText('현재 비밀번호');
    const newPw = screen.getByLabelText('새 비밀번호');
    const confirmPw = screen.getByLabelText('새 비밀번호 확인');

    await user.type(currentPw, 'OldPass123!');
    await user.type(newPw, 'NewPass123!');
    await user.type(confirmPw, 'DifferentPass123!');

    // Submit
    const submitBtn = screen.getByRole('button', { name: '비밀번호 변경' });
    await user.click(submitBtn);

    // Error message should appear
    expect(screen.getByText('새 비밀번호가 일치하지 않습니다.')).toBeTruthy();

    // fetch should NOT have been called
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  // Test 5: Successful submit
  it('비밀번호 변경 성공 시 onClose가 호출되고 토스트가 표시된다', async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    await fillValidForm(user)();

    const submitBtn = screen.getByRole('button', { name: '비밀번호 변경' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Access token should be updated
    expect(mockSetAccessToken).toHaveBeenCalledWith('new-access-token');

    // Toast should be shown
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: '비밀번호가 변경되었습니다', type: 'success' }),
    );
  });

  // Test 6: INVALID_CREDENTIALS error
  it('INVALID_CREDENTIALS 에러 시 에러 알림이 표시된다', async () => {
    const user = userEvent.setup();

    // Import the mocked ApiError to create a proper instance
    const { ApiError } = await import('../../lib/api');
    mockApiFetch.mockRejectedValueOnce(
      new ApiError('INVALID_CREDENTIALS', 'Invalid credentials', 401),
    );

    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    await fillValidForm(user)();

    const submitBtn = screen.getByRole('button', { name: '비밀번호 변경' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호가 올바르지 않습니다.')).toBeTruthy();
    });

    // Should have role="alert"
    expect(screen.getByRole('alert')).toBeTruthy();

    // onClose should NOT have been called
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  // Test 7: ACCOUNT_LOCKED error
  it('ACCOUNT_LOCKED 에러 시 경고 알림이 표시된다', async () => {
    const user = userEvent.setup();

    const { ApiError } = await import('../../lib/api');
    mockApiFetch.mockRejectedValueOnce(
      new ApiError('ACCOUNT_LOCKED', '15분 후 재시도', 401),
    );

    render(<PasswordChangeModal isOpen={true} onClose={mockOnClose} />);

    await fillValidForm(user)();

    const submitBtn = screen.getByRole('button', { name: '비밀번호 변경' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('계정이 잠겼습니다. 15분 후에 다시 시도해주세요.')).toBeTruthy();
    });

    // Should have role="alert"
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
