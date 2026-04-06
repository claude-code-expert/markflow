// ─── Unified Image Upload Module ──────────────────────────────────────────────
// Avatar 업로드와 에디터 이미지 업로드 모두 이 모듈을 통해 R2 Worker로 업로드한다.
// Worker URL 해석 우선순위: env var > localStorage > '' (미설정)

import { createCloudflareUploader, validateImageFile } from '@markflow/editor';

const STORAGE_KEY = 'mf-cf-worker-url';
const UPLOAD_ENABLED_KEY = 'mf-image-upload-enabled';

const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Error ────────────────────────────────────────────────────────────────────

export class ImageUploadError extends Error {
  constructor(
    public readonly code: 'NO_WORKER_URL' | 'VALIDATION_FAILED' | 'UPLOAD_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ImageUploadConfig {
  workerUrl: string;
  isFromEnv: boolean;
}

/** env var 우선, localStorage fallback */
export function getWorkerUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_R2_WORKER_URL ?? '';
  if (fromEnv) return fromEnv;

  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

/** 설정 페이지에서 출처(env/localStorage) 표시용 */
export function getUploadConfig(): ImageUploadConfig {
  const fromEnv = process.env.NEXT_PUBLIC_R2_WORKER_URL ?? '';
  if (fromEnv) return { workerUrl: fromEnv, isFromEnv: true };

  if (typeof window === 'undefined') return { workerUrl: '', isFromEnv: false };
  const fromStorage = localStorage.getItem(STORAGE_KEY) ?? '';
  return { workerUrl: fromStorage, isFromEnv: false };
}

export function saveWorkerUrl(url: string): void {
  const trimmed = url.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearWorkerUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Image Upload Toggle ─────────────────────────────────────────────────────

/** 이미지 업로드 사용 여부 조회 (기본값: false) */
export function isImageUploadEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(UPLOAD_ENABLED_KEY) === 'true';
}

/** 이미지 업로드 사용 여부 저장 */
export function setImageUploadEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(UPLOAD_ENABLED_KEY, 'true');
  } else {
    localStorage.removeItem(UPLOAD_ENABLED_KEY);
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/** Worker URL이 설정되어 있으면 uploader 반환, 없으면 null */
export function createUploader(): ((file: File) => Promise<string>) | null {
  const url = getWorkerUrl();
  if (!url) return null;
  return createCloudflareUploader(url);
}

/** 파일 검증 + 업로드. Worker 미설정 시 throw */
export async function uploadImage(file: File): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new ImageUploadError('VALIDATION_FAILED', validation.error ?? '파일 검증 실패');
  }

  const uploader = createUploader();
  if (!uploader) {
    throw new ImageUploadError(
      'NO_WORKER_URL',
      '이미지 저장소가 설정되지 않았습니다. 설정 > 이미지 저장소에서 Worker URL을 입력해주세요.',
    );
  }

  try {
    return await uploader(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : '업로드 실패';
    throw new ImageUploadError('UPLOAD_FAILED', message);
  }
}

// ─── Avatar Validation ────────────────────────────────────────────────────────

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

/** Avatar 전용 검증 (JPG/PNG/WebP만, 5MB 제한) */
export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    return { valid: false, error: 'JPG, PNG 또는 WebP 파일만 업로드할 수 있습니다.' };
  }

  if (file.size > AVATAR_MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `파일 크기가 너무 큽니다. (${sizeMB}MB / 최대 5MB)` };
  }

  if (file.size === 0) {
    return { valid: false, error: '빈 파일은 업로드할 수 없습니다.' };
  }

  return { valid: true };
}

// ─── Test Connection ──────────────────────────────────────────────────────────

/** 1x1 transparent PNG 생성 (테스트용, 67 bytes) */
function createTestPng(): File {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], 'test.png', { type: 'image/png' });
}

export interface TestConnectionResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/** 지정된 Worker URL로 테스트 이미지를 업로드하여 연결 확인 */
export async function testConnection(url: string): Promise<TestConnectionResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { success: false, error: 'URL을 입력해주세요.' };
  }

  try {
    const uploader = createCloudflareUploader(trimmed);
    const testFile = createTestPng();
    const imageUrl = await uploader(testFile);
    return { success: true, imageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : '연결 실패';
    return { success: false, error: message };
  }
}
