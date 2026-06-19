import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const weatherContract = defineContract({
  method: 'get',
  path: '/api/weather',
  summary: 'Get current weather conditions for a lat/lng coordinate via Google Weather API',
  tags: ['Weather'],
  security: 'clerkSession',
  request: {
    query: z.object({ lat: z.string(), lng: z.string() }),
  },
  responses: {
    200: {
      description: 'Current weather conditions',
      schema: z.object({
        condition: z.string(),
        iconKind: z.enum(['Clear', 'Cloudy', 'PartlyCloudy', 'Rain', 'Storm', 'Snow', 'Fog', 'Wind', 'Haze', 'Hot', 'Cold', 'Other']),
        temperatureCelsius: z.number(),
        apparentTemperatureCelsius: z.number(),
        humidity: z.number(),
      }),
    },
  },
  successStatus: 200,
});
