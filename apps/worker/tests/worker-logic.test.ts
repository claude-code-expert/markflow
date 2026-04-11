// ─── R2 Worker CORS + Auth Unit Tests ───────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { corsHeaders, checkAuth, type Env } from '../src/helpers'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(origin?: string): Request {
  const headers = new Headers()
  if (origin) {
    headers.set('Origin', origin)
  }
  return new Request('https://worker.example.com/upload', {
    method: 'POST',
    headers,
  })
}

function makeRequestWithAuth(origin: string, authHeader?: string): Request {
  const headers = new Headers()
  headers.set('Origin', origin)
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }
  return new Request('https://worker.example.com/upload', {
    method: 'POST',
    headers,
  })
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    BUCKET: {} as R2Bucket,
    PUBLIC_URL: 'https://cdn.example.com',
    ...overrides,
  }
}

// ─── corsHeaders() Tests ────────────────────────────────────────────────────

describe('corsHeaders', () => {
  it('Test 1: ALLOWED_ORIGINS 미설정 시 빈 allowOrigin 반환 (fail-closed)', () => {
    const request = makeRequest('https://evil.com')
    const env = makeEnv() // ALLOWED_ORIGINS undefined

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Origin']).toBe('')
  })

  it('Test 2: ALLOWED_ORIGINS에 일치하는 origin 시 해당 origin 반환', () => {
    const request = makeRequest('https://app.markflow.io')
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://app.markflow.io' })

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Origin']).toBe('https://app.markflow.io')
  })

  it('Test 3: ALLOWED_ORIGINS에 불일치 origin 시 빈 문자열 반환', () => {
    const request = makeRequest('https://evil.com')
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://app.markflow.io' })

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Origin']).toBe('')
  })

  it('Test 4: Access-Control-Allow-Headers에 Authorization이 포함됨', () => {
    const request = makeRequest('https://app.markflow.io')
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://app.markflow.io' })

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Headers']).toContain('Authorization')
    expect(result['Access-Control-Allow-Headers']).toContain('Content-Type')
  })

  it('다수 origin 중 일치하는 것이 있으면 해당 origin 반환', () => {
    const request = makeRequest('https://staging.markflow.io')
    const env = makeEnv({
      ALLOWED_ORIGINS: 'https://app.markflow.io, https://staging.markflow.io',
    })

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Origin']).toBe('https://staging.markflow.io')
  })

  it('Origin 헤더 없는 요청 시 빈 allowOrigin 반환', () => {
    const request = makeRequest() // no origin
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://app.markflow.io' })

    const result = corsHeaders(request, env)

    expect(result['Access-Control-Allow-Origin']).toBe('')
  })
})

// ─── checkAuth() Tests ──────────────────────────────────────────────────────

describe('checkAuth', () => {
  const corsStub: Record<string, string> = {
    'Access-Control-Allow-Origin': 'https://app.markflow.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  it('Test 5: API_SECRET 미설정(undefined) 시 null 반환 (인증 스킵)', () => {
    const request = makeRequest('https://app.markflow.io')
    const env = makeEnv() // API_SECRET undefined

    const result = checkAuth(request, env, corsStub)

    expect(result).toBeNull()
  })

  it('Test 6: API_SECRET 설정 + 올바른 Bearer token 시 null 반환 (통과)', () => {
    const request = makeRequestWithAuth('https://app.markflow.io', 'Bearer secret123')
    const env = makeEnv({ API_SECRET: 'secret123' })

    const result = checkAuth(request, env, corsStub)

    expect(result).toBeNull()
  })

  it('Test 7: API_SECRET 설정 + 토큰 없으면 403 Response 반환', async () => {
    const request = makeRequestWithAuth('https://app.markflow.io')
    const env = makeEnv({ API_SECRET: 'secret123' })

    const result = checkAuth(request, env, corsStub)

    expect(result).toBeInstanceOf(Response)
    expect(result!.status).toBe(403)
    const body = await result!.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Unauthorized')
  })

  it('Test 8: API_SECRET 설정 + 잘못된 토큰이면 403 Response 반환', async () => {
    const request = makeRequestWithAuth('https://app.markflow.io', 'Bearer wrong-token')
    const env = makeEnv({ API_SECRET: 'secret123' })

    const result = checkAuth(request, env, corsStub)

    expect(result).toBeInstanceOf(Response)
    expect(result!.status).toBe(403)
    const body = await result!.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Unauthorized')
  })

  it('API_SECRET 설정 + Bearer 접두어 없는 토큰이면 403 반환', async () => {
    const request = makeRequestWithAuth('https://app.markflow.io', 'Basic secret123')
    const env = makeEnv({ API_SECRET: 'secret123' })

    const result = checkAuth(request, env, corsStub)

    expect(result).toBeInstanceOf(Response)
    expect(result!.status).toBe(403)
  })
})
