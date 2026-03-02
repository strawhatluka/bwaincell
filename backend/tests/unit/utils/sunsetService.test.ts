/**
 * Unit tests for sunsetService
 *
 * Tests the sunset time fetching service that resolves ZIP codes to coordinates,
 * fetches sunset times from sunrise-sunset.org, and formats Discord embeds.
 * Uses global fetch mock to avoid real HTTP requests.
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock discord.js EmbedBuilder
jest.mock('discord.js', () => {
  const mockEmbed = {
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
  };
  return {
    EmbedBuilder: jest.fn().mockImplementation(() => mockEmbed),
  };
});

// Global fetch mock
const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  getCoordinatesFromZip,
  getSunsetTime,
  formatSunsetEmbed,
} from '../../../utils/sunsetService';
import { EmbedBuilder } from 'discord.js';

describe('sunsetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // ─── getCoordinatesFromZip ──────────────────────────────────────────

  describe('getCoordinatesFromZip', () => {
    it('should fetch and return coordinates for a valid ZIP code', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [{ latitude: '34.0901', longitude: '-118.4065' }],
        }),
      });

      // ACT
      const result = await getCoordinatesFromZip('90210');

      // ASSERT
      expect(mockFetch).toHaveBeenCalledWith('https://api.zippopotam.us/us/90210');
      expect(result).toEqual({ lat: 34.0901, lng: -118.4065 });
    });

    it('should return cached coordinates on second call without fetching again', async () => {
      // ARRANGE - first call populates the cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [{ latitude: '40.7128', longitude: '-74.0060' }],
        }),
      });
      await getCoordinatesFromZip('10001');
      mockFetch.mockReset();

      // ACT - second call should use cache
      const result = await getCoordinatesFromZip('10001');

      // ASSERT
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
    });

    it('should throw when the HTTP response is not ok', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // ACT & ASSERT
      await expect(getCoordinatesFromZip('00000')).rejects.toThrow(
        'Unable to find coordinates for ZIP code: 00000'
      );
    });

    it('should throw when response has no places data', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] }),
      });

      // ACT & ASSERT
      await expect(getCoordinatesFromZip('11111')).rejects.toThrow(
        'Unable to find coordinates for ZIP code: 11111'
      );
    });

    it('should throw on fetch network error', async () => {
      // ARRANGE
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      // ACT & ASSERT
      await expect(getCoordinatesFromZip('22222')).rejects.toThrow(
        'Unable to find coordinates for ZIP code: 22222'
      );
    });
  });

  // ─── getSunsetTime ─────────────────────────────────────────────────

  describe('getSunsetTime', () => {
    it('should fetch sunset time with default date (today)', async () => {
      // ARRANGE
      const sunsetISO = '2026-03-02T01:30:00+00:00';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: { sunset: sunsetISO },
        }),
      });

      // ACT
      const result = await getSunsetTime(34.09, -118.41);

      // ASSERT
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sunrise-sunset.org/json?lat=34.09&lng=-118.41&date=today&formatted=0'
      );
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(new Date(sunsetISO).toISOString());
    });

    it('should fetch sunset time with a specific date', async () => {
      // ARRANGE
      const sunsetISO = '2026-06-21T03:00:00+00:00';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: { sunset: sunsetISO },
        }),
      });

      // ACT
      const result = await getSunsetTime(40.71, -74.01, '2026-06-21');

      // ASSERT
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sunrise-sunset.org/json?lat=40.71&lng=-74.01&date=2026-06-21&formatted=0'
      );
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(new Date(sunsetISO).toISOString());
    });

    it('should throw when the HTTP response is not ok', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // ACT & ASSERT
      await expect(getSunsetTime(34.09, -118.41)).rejects.toThrow('Sunset API request failed: 500');
    });

    it('should throw when the API returns a non-OK status', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'INVALID_REQUEST',
          results: {},
        }),
      });

      // ACT & ASSERT
      await expect(getSunsetTime(34.09, -118.41)).rejects.toThrow(
        'Sunset API returned status: INVALID_REQUEST'
      );
    });

    it('should throw when results have no sunset field', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: {},
        }),
      });

      // ACT & ASSERT
      await expect(getSunsetTime(34.09, -118.41)).rejects.toThrow('No sunset time in API response');
    });

    it('should throw when sunset time string is invalid', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: { sunset: 'not-a-date' },
        }),
      });

      // ACT & ASSERT
      await expect(getSunsetTime(34.09, -118.41)).rejects.toThrow(
        'Invalid sunset time from API: not-a-date'
      );
    });
  });

  // ─── formatSunsetEmbed ─────────────────────────────────────────────

  describe('formatSunsetEmbed', () => {
    it('should create an embed with correct title and description', () => {
      // ARRANGE
      const sunsetTime = new Date('2026-03-02T01:30:00Z');
      const timezone = 'America/Los_Angeles';

      // ACT
      const result = formatSunsetEmbed(sunsetTime, timezone);

      // ASSERT
      expect(EmbedBuilder).toHaveBeenCalled();
      expect(result.setTitle).toHaveBeenCalledWith(expect.stringContaining('Sunset Announcement'));
      expect(result.setDescription).toHaveBeenCalledWith(
        expect.stringContaining('The sun will set today at')
      );
    });

    it('should set the correct embed color (0xff6b35)', () => {
      // ARRANGE
      const sunsetTime = new Date('2026-03-02T01:30:00Z');
      const timezone = 'America/Los_Angeles';

      // ACT
      formatSunsetEmbed(sunsetTime, timezone);

      // ASSERT
      const mockInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
      expect(mockInstance.setColor).toHaveBeenCalledWith(0xff6b35);
    });

    it('should add a sunset time field', () => {
      // ARRANGE
      const sunsetTime = new Date('2026-03-02T01:30:00Z');
      const timezone = 'America/Los_Angeles';

      // ACT
      formatSunsetEmbed(sunsetTime, timezone);

      // ASSERT
      const mockInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
      expect(mockInstance.addFields).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Sunset Time'),
          inline: true,
        })
      );
    });
  });
});
