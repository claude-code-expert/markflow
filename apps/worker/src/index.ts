// ─── Cloudflare Worker — R2 Image Upload ─────────────────────────────────────

interface Env {
  BUCKET: R2Bucket
  PUBLIC_URL: string
  ALLOWED_ORIGINS?: string // comma-separated origins, default: "*"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '*'
  const allowed = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? ['*']
  const allowOrigin = allowed.includes('*') || allowed.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body: object, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return map[contentType] ?? 'bin'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env)

    // ── Preflight ──────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // ── Health check ───────────────────────────────────────────────────────
    const url = new URL(request.url)
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ status: 'ok', service: 'markflow-r2-uploader' }, 200, cors)
    }

    // ── Upload ─────────────────────────────────────────────────────────────
    if (url.pathname === '/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file || !(file instanceof File)) {
          return jsonResponse({ success: false, error: 'No file provided. Use "file" field.' }, 400, cors)
        }

        // Validate type
        if (!ALLOWED_TYPES.has(file.type)) {
          return jsonResponse(
            { success: false, error: `Invalid file type: ${file.type}. Allowed: png, jpg, gif, webp, svg` },
            400,
            cors,
          )
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
          return jsonResponse(
            { success: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB` },
            400,
            cors,
          )
        }

        // Generate unique key
        const timestamp = Date.now()
        const uuid = crypto.randomUUID()
        const ext = getExtension(file.type)
        const key = `images/${timestamp}-${uuid}.${ext}`

        // Upload to R2
        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        })

        // Build public URL
        const publicUrl = env.PUBLIC_URL.replace(/\/+$/, '')
        const imageUrl = `${publicUrl}/${key}`

        return jsonResponse({ success: true, url: imageUrl }, 200, cors)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return jsonResponse({ success: false, error: message }, 500, cors)
      }
    }

    // ── 404 ────────────────────────────────────────────────────────────────
    return jsonResponse({ success: false, error: 'Not found. Use POST /upload' }, 404, cors)
  },
}
