/* eslint-disable no-undef */
import { EmbedBuilder } from 'discord.js';
import { DateTime } from 'luxon';
import { createLogger } from '../shared/utils/logger';

const logger = createLogger('SunsetService');

// US ZIP code to lat/lng mapping for common codes
// For a production app, consider using a geocoding API or npm package
// This lightweight approach avoids external dependencies for the MVP
const ZIP_COORDINATES: Record<string, { lat: number; lng: number }> = {};

/**
 * Look up coordinates for a US ZIP code using a geocoding API fallback.
 * First checks local cache, then falls back to api.zippopotam.us (free, no key).
 */
export async function getCoordinatesFromZip(
  zipCode: string
): Promise<{ lat: number; lng: number }> {
  // Check local cache
  if (ZIP_COORDINATES[zipCode]) {
    return ZIP_COORDINATES[zipCode];
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);

    if (!response.ok) {
      throw new Error(`ZIP code lookup failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      places?: Array<{ latitude: string; longitude: string }>;
    };
    const place = data.places?.[0];

    if (!place) {
      throw new Error(`No results found for ZIP code: ${zipCode}`);
    }

    const coords = {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };

    // Cache for future lookups
    ZIP_COORDINATES[zipCode] = coords;

    logger.info('ZIP code coordinates resolved', { zipCode, ...coords });
    return coords;
  } catch (error) {
    logger.error('Failed to resolve ZIP code coordinates', {
      zipCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Unable to find coordinates for ZIP code: ${zipCode}`);
  }
}

/**
 * Fetch sunset time from sunrise-sunset.org API.
 * Returns a Date object for today's sunset in UTC.
 */
export async function getSunsetTime(lat: number, lng: number, date?: string): Promise<Date> {
  const dateParam = date || 'today';

  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateParam}&formatted=0`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Sunset API request failed: ${response.status}`);
    }

    const data = (await response.json()) as { status: string; results?: { sunset?: string } };

    if (data.status !== 'OK') {
      throw new Error(`Sunset API returned status: ${data.status}`);
    }

    const sunsetTimeStr = data.results?.sunset;
    if (!sunsetTimeStr) {
      throw new Error('No sunset time in API response');
    }

    const sunsetDate = new Date(sunsetTimeStr);

    if (isNaN(sunsetDate.getTime())) {
      throw new Error(`Invalid sunset time from API: ${sunsetTimeStr}`);
    }

    logger.info('Sunset time fetched', {
      lat,
      lng,
      date: dateParam,
      sunsetUTC: sunsetDate.toISOString(),
    });

    return sunsetDate;
  } catch (error) {
    logger.error('Failed to fetch sunset time', {
      lat,
      lng,
      date: dateParam,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Format a sunset announcement Discord embed.
 */
export function formatSunsetEmbed(sunsetTime: Date, timezone: string): EmbedBuilder {
  const sunsetLocal = DateTime.fromJSDate(sunsetTime).setZone(timezone);
  const sunsetDisplay = sunsetLocal.toFormat('h:mm a');

  return new EmbedBuilder()
    .setTitle('🌅 Sunset Announcement')
    .setDescription(`The sun will set today at **${sunsetDisplay}**`)
    .addFields({
      name: '🕐 Sunset Time',
      value: sunsetLocal.toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET),
      inline: true,
    })
    .setColor(0xff6b35)
    .setTimestamp();
}
