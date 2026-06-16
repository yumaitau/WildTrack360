import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}))

vi.mock('@/lib/clerk-server', () => ({
  auth: mockAuth,
}))

function weatherRequest(query = 'lat=-35.2809&lng=149.1300') {
  return new Request(`https://tenant.localhost:3000/api/weather?${query}`, {
    headers: { host: 'tenant.localhost:3000' },
  })
}

describe('GET /api/weather', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.GOOGLE_WEATHER_API_KEY = 'google-weather-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          weatherCondition: {
            type: 'PARTLY_CLOUDY',
            description: { text: 'Partly cloudy' },
          },
          temperature: { degrees: 22.4 },
          feelsLikeTemperature: { degrees: 21.8 },
          relativeHumidity: 62,
        })
      )
    )
  })

  it('rejects missing auth', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null, sessionClaims: {} })

    const response = await GET(weatherRequest())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 JSON for invalid lat/lng', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      sessionClaims: { org_url: 'tenant' },
    })

    const response = await GET(weatherRequest('lat=not-a-number&lng=149.1300'))

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'lat and lng must be finite numbers.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 JSON for out-of-range lat/lng', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      sessionClaims: { org_url: 'tenant' },
    })

    const response = await GET(weatherRequest('lat=95&lng=200'))

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({
      error: 'lat must be between -90 and 90 and lng between -180 and 180.',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns JSON when the Google Weather API key is missing', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      sessionClaims: { org_url: 'tenant' },
    })
    delete process.env.GOOGLE_WEATHER_API_KEY

    const response = await GET(weatherRequest())

    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'Missing Google Weather API key.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps Google response to the exact Android response object', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      sessionClaims: { org_url: 'tenant' },
    })

    const response = await GET(weatherRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      condition: 'Partly cloudy',
      iconKind: 'PartlyCloudy',
      temperatureCelsius: 22.4,
      apparentTemperatureCelsius: 21.8,
      humidity: 0.62,
    })

    const url = new URL(vi.mocked(fetch).mock.calls[0][0].toString())
    expect(url.origin + url.pathname).toBe('https://weather.googleapis.com/v1/currentConditions:lookup')
    expect(url.searchParams.get('key')).toBe('google-weather-key')
    expect(url.searchParams.get('location.latitude')).toBe('-35.2809')
    expect(url.searchParams.get('location.longitude')).toBe('149.13')
    expect(url.searchParams.get('unitsSystem')).toBe('METRIC')
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ signal: expect.any(AbortSignal) })
  })

  it('returns JSON 502 when Google Weather fails', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      sessionClaims: { org_url: 'tenant' },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('upstream failed', { status: 503 })))

    const response = await GET(weatherRequest())

    expect(response.status).toBe(502)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'Google Weather request failed.' })
  })
})
