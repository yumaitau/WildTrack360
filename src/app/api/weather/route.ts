import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { extractSubdomain } from '@/lib/subdomain';
import { isDbOrg } from '@/lib/org-source';
import { route } from '@/lib/openapi/route';
import { weatherContract } from './openapi';

type WeatherIconKind =
  | 'Clear' | 'Cloudy' | 'PartlyCloudy' | 'Rain' | 'Storm' | 'Snow'
  | 'Fog' | 'Wind' | 'Haze' | 'Hot' | 'Cold' | 'Other';

type GoogleWeatherResponse = {
  weatherCondition?: { type?: string; description?: { text?: string } };
  temperature?: { degrees?: number };
  feelsLikeTemperature?: { degrees?: number };
  relativeHumidity?: number;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const GOOGLE_WEATHER_TIMEOUT_MS = 5000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseFiniteNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapIconKind(condition: GoogleWeatherResponse['weatherCondition']): WeatherIconKind {
  const text = `${condition?.type ?? ''} ${condition?.description?.text ?? ''}`.toLowerCase();
  if (/\b(thunder|storm|lightning)\b/.test(text)) return 'Storm';
  if (/\b(snow|sleet|blizzard|flurr)\b/.test(text)) return 'Snow';
  if (/\b(rain|drizzle|shower|precipitation)\b/.test(text)) return 'Rain';
  if (/\b(fog|mist)\b/.test(text)) return 'Fog';
  if (/\b(haze|smoke|dust|sand)\b/.test(text)) return 'Haze';
  if (/\b(wind|windy|squall)\b/.test(text)) return 'Wind';
  if (/\b(hot|heat)\b/.test(text)) return 'Hot';
  if (/\b(cold|freez|frost|ice)\b/.test(text)) return 'Cold';
  if (/\b(partly|mostly|scattered|few clouds|intermittent)\b/.test(text)) return 'PartlyCloudy';
  if (/\b(cloud|overcast)\b/.test(text)) return 'Cloudy';
  if (/\b(clear|sunny|fair)\b/.test(text)) return 'Clear';
  return 'Other';
}

function mapGoogleWeatherResponse(data: GoogleWeatherResponse) {
  const condition = data.weatherCondition?.description?.text;
  const temperatureCelsius = data.temperature?.degrees;
  const apparentTemperatureCelsius = data.feelsLikeTemperature?.degrees;
  const relativeHumidity = data.relativeHumidity;

  if (
    typeof condition !== 'string' ||
    typeof temperatureCelsius !== 'number' || !Number.isFinite(temperatureCelsius) ||
    typeof apparentTemperatureCelsius !== 'number' || !Number.isFinite(apparentTemperatureCelsius) ||
    typeof relativeHumidity !== 'number' || !Number.isFinite(relativeHumidity)
  ) {
    throw new Error('Google Weather response was incomplete.');
  }

  return {
    condition,
    iconKind: mapIconKind(data.weatherCondition),
    temperatureCelsius,
    apparentTemperatureCelsius,
    humidity: relativeHumidity / 100,
  };
}

export const GET = route(weatherContract, async ({ query, request }) => {
  let session: Awaited<ReturnType<typeof auth>>;
  try {
    session = await auth();
  } catch {
    return errorResponse('Unauthorized', 401);
  }

  const { userId, orgId, sessionClaims } = session;
  if (!userId) return errorResponse('Unauthorized', 401);
  if (!orgId) return errorResponse('Forbidden', 403);

  // In db mode auth() only returns a non-null orgId when the user is a
  // member of the subdomain's organisation, so the (already-passed) orgId
  // check above covers the tenant guard; the org_url JWT claim only exists
  // while Clerk is authoritative.
  const host = request.headers.get('host') ?? '';
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);
  if (!(await isDbOrg(orgId)) && subdomain && sessionClaims?.org_url !== subdomain) {
    return errorResponse('Forbidden', 403);
  }

  const lat = parseFiniteNumber(query.lat);
  const lng = parseFiniteNumber(query.lng);

  if (lat === null || lng === null) {
    return errorResponse('lat and lng must be finite numbers.', 400);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return errorResponse('lat must be between -90 and 90 and lng between -180 and 180.', 400);
  }

  const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
  if (!apiKey) return errorResponse('Missing Google Weather API key.', 500);

  const weatherUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  weatherUrl.searchParams.set('key', apiKey);
  weatherUrl.searchParams.set('location.latitude', String(lat));
  weatherUrl.searchParams.set('location.longitude', String(lng));
  weatherUrl.searchParams.set('unitsSystem', 'METRIC');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_WEATHER_TIMEOUT_MS);

  try {
    const response = await fetch(weatherUrl, { signal: controller.signal });
    if (!response.ok) return errorResponse('Google Weather request failed.', 502);

    const googleWeather = (await response.json()) as GoogleWeatherResponse;
    return { data: mapGoogleWeatherResponse(googleWeather) };
  } catch {
    return errorResponse('Google Weather request failed.', 502);
  } finally {
    clearTimeout(timeout);
  }
});
