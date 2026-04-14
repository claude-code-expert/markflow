import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCloudflareUploader, createTestImage } from '../cloudflareUploader';

const WORKER_URL = 'https://worker.example.com';
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('createCloudflareUploader', () => {
  describe('Configuration', () => {
    it('throws when workerUrl is empty string', () => {
      const upload = createCloudflareUploader('');
      expect(upload(createTestImage())).rejects.toThrow(
        'Cloudflare Worker URL is not configured',
      );
    });
  });

  describe('Successful upload', () => {
    it('returns URL on successful upload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            url: 'https://r2.example.com/img.png',
          }),
      });

      const upload = createCloudflareUploader(WORKER_URL);
      const url = await upload(createTestImage());
      expect(url).toBe('https://r2.example.com/img.png');
    });

    it('sends POST request to workerUrl/upload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            url: 'https://r2.example.com/img.png',
          }),
      });

      const upload = createCloudflareUploader(WORKER_URL);
      await upload(createTestImage());

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://worker.example.com/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('CORS error', () => {
    it('re-throws TypeError from fetch (CORS simulation)', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new TypeError('Failed to fetch'));

      const upload = createCloudflareUploader(WORKER_URL);
      await expect(upload(createTestImage())).rejects.toThrow('Failed to fetch');
    });
  });

  describe('Error handling', () => {
    it('throws on non-ok response with status code', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        text: () => Promise.resolve('File too large'),
      });

      const upload = createCloudflareUploader(WORKER_URL);
      await expect(upload(createTestImage())).rejects.toThrow(
        'Upload failed (413)',
      );
    });

    it('throws error message when success is false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: false, error: 'Quota exceeded' }),
      });

      const upload = createCloudflareUploader(WORKER_URL);
      await expect(upload(createTestImage())).rejects.toThrow('Quota exceeded');
    });

    it('throws invalid response when success is true but url is missing', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const upload = createCloudflareUploader(WORKER_URL);
      await expect(upload(createTestImage())).rejects.toThrow(
        'Upload failed: invalid response',
      );
    });
  });
});
