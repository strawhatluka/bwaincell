/**
 * Unit tests for ImageService
 *
 * Tests the image generation service for quote images.
 */

// Mock logger BEFORE imports to prevent real Winston file transports from opening
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock dependencies BEFORE imports
const mockLoadImage = jest.fn();
const mockToBuffer = jest.fn();
const mockGetContext = jest.fn();
const mockDrawImage = jest.fn();
const mockGetImageData = jest.fn();
const mockPutImageData = jest.fn();
const mockCreateLinearGradient = jest.fn();
const mockCreateRadialGradient = jest.fn();
const mockAddColorStop = jest.fn();
const mockFillRect = jest.fn();
const mockFillText = jest.fn();
const mockMeasureText = jest.fn();
const mockBeginPath = jest.fn();
const mockArc = jest.fn();
const mockClosePath = jest.fn();
const mockClip = jest.fn();
const mockSave = jest.fn();
const mockRestore = jest.fn();

// Mock child_process so spawnSync probe returns success (canvasAvailable = true)
jest.mock('child_process', () => ({
  spawnSync: jest.fn().mockReturnValue({ status: 0 }),
}));

// Mock skia-canvas with Canvas constructor (skia-canvas exports Canvas class, not createCanvas)
let mockCanvasInstance = {};
jest.mock('skia-canvas', () => ({
  Canvas: jest.fn().mockImplementation(() => mockCanvasInstance),
  loadImage: mockLoadImage,
}));

const mockHttpsGet = jest.fn();
jest.mock('https', () => ({
  get: mockHttpsGet,
}));

import { ImageService } from '../../../utils/imageService';
import { EventEmitter } from 'events';

describe('ImageService', () => {
  let mockCanvas: any;
  let mockContext: any;
  let mockGradient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock gradient
    mockGradient = {
      addColorStop: mockAddColorStop,
    };

    // Setup mock canvas context
    mockContext = {
      drawImage: mockDrawImage,
      getImageData: mockGetImageData,
      putImageData: mockPutImageData,
      createLinearGradient: mockCreateLinearGradient.mockReturnValue(mockGradient),
      createRadialGradient: mockCreateRadialGradient.mockReturnValue(mockGradient),
      fillRect: mockFillRect,
      fillText: mockFillText,
      measureText: mockMeasureText.mockReturnValue({ width: 100 }),
      beginPath: mockBeginPath,
      arc: mockArc,
      closePath: mockClosePath,
      clip: mockClip,
      save: mockSave,
      restore: mockRestore,
      fillStyle: '',
      font: '',
      textAlign: '',
      filter: '',
    };

    // Setup mock canvas instance (returned by Canvas constructor)
    mockCanvas = {
      getContext: mockGetContext.mockReturnValue(mockContext),
      toBuffer: mockToBuffer.mockResolvedValue(Buffer.from('fake-png-data')),
    };

    // Set the instance that the Canvas constructor mock will return
    mockCanvasInstance = mockCanvas;
    mockLoadImage.mockResolvedValue({
      width: 512,
      height: 512,
    });

    // Setup mock ImageData for grayscale testing
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]), // RGB pixels
      width: 800,
      height: 600,
    });
  });

  describe('generateQuoteImage', () => {
    it('should create canvas with correct dimensions', async () => {
      // Mock successful avatar fetch
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote text',
        'TestUser'
      );

      const { Canvas } = require('skia-canvas');
      expect(Canvas).toHaveBeenCalledWith(1200, 630);
    });

    it('should fetch and draw avatar as background', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote',
        'TestUser'
      );

      expect(mockLoadImage).toHaveBeenCalled();
      expect(mockDrawImage).toHaveBeenCalled();
    });

    it('should create circular clipped avatar', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote',
        'TestUser'
      );

      expect(mockSave).toHaveBeenCalled();
      expect(mockBeginPath).toHaveBeenCalled();
      expect(mockArc).toHaveBeenCalled();
      expect(mockClip).toHaveBeenCalled();
      expect(mockRestore).toHaveBeenCalled();
    });

    it('should create radial gradient spotlight', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote',
        'TestUser'
      );

      // Radial gradient spotlight on left side (extended)
      expect(mockCreateRadialGradient).toHaveBeenCalled();
      expect(mockAddColorStop).toHaveBeenCalledWith(0, 'rgba(255, 255, 255, 0.5)');
      expect(mockAddColorStop).toHaveBeenCalledWith(0.4, 'rgba(255, 255, 255, 0.2)');
      expect(mockAddColorStop).toHaveBeenCalledWith(0.7, 'rgba(255, 255, 255, 0.05)');
      expect(mockAddColorStop).toHaveBeenCalledWith(1, 'rgba(0, 0, 0, 0)');
    });

    it('should render quote text', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote text',
        'TestUser'
      );

      // Should render text
      expect(mockFillText).toHaveBeenCalled();
      // Check text rendering calls (quote text + username)
      const fillTextCalls = mockFillText.mock.calls;
      expect(fillTextCalls.length).toBeGreaterThan(0);
    });

    it('should render username attribution', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote',
        'TestUser'
      );

      // Username should be rendered with "- " prefix
      const fillTextCalls = mockFillText.mock.calls;
      const usernameCall = fillTextCalls.find((call) => call[0].includes('- TestUser'));
      expect(usernameCall).toBeDefined();
    });

    it('should return PNG buffer', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      const result = await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        'Test quote',
        'TestUser'
      );

      expect(mockToBuffer).toHaveBeenCalledWith('png');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake-png-data');
    });

    it('should wrap long text into multiple lines', async () => {
      // Mock measureText to simulate text width
      mockMeasureText.mockImplementation((text: string) => {
        // Simulate that adding words increases width
        return { width: text.length * 10 }; // 10 pixels per character
      });

      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      const longText =
        'This is a very long quote that should definitely wrap to multiple lines when rendered on the canvas because it exceeds the maximum width allowed';

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        longText,
        'TestUser'
      );

      // Should call fillText multiple times for wrapped lines (plus username)
      expect(mockFillText.mock.calls.length).toBeGreaterThan(2);
    });

    it('should handle avatar fetch errors gracefully', async () => {
      const mockRequest = new EventEmitter() as any;
      mockHttpsGet.mockImplementation(() => {
        setImmediate(() => {
          mockRequest.emit('error', new Error('Network error'));
        });
        return mockRequest;
      });

      await expect(
        ImageService.generateQuoteImage(
          'https://cdn.discordapp.com/avatars/123/abc.png',
          'Test quote',
          'TestUser'
        )
      ).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors during avatar fetch', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('error', new Error('HTTP 404'));
        });
        return new EventEmitter();
      });

      await expect(
        ImageService.generateQuoteImage(
          'https://cdn.discordapp.com/avatars/123/abc.png',
          'Test quote',
          'TestUser'
        )
      ).rejects.toThrow('HTTP 404');
    });

    it('should limit text to 10 lines with ellipsis', async () => {
      // Mock measureText to force line breaks
      mockMeasureText.mockImplementation(() => {
        // Each word exceeds max width, forcing one word per line
        return { width: 1000 };
      });

      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      // Create text with 15 words (should result in 15 lines without limit)
      const manyLinesText = Array(15).fill('word').join(' ');

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        manyLinesText,
        'TestUser'
      );

      // Should only render 10 lines of quote text + 1 username + 1 watermark = 12 total
      // With ellipsis on the 10th line
      expect(mockFillText.mock.calls.length).toBeLessThanOrEqual(12);
    });

    it('should handle empty quote text', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        '',
        'TestUser'
      );

      // Should still render username (with "- " not "— ")
      const usernameCall = mockFillText.mock.calls.find((call) => call[0].includes('- TestUser'));
      expect(usernameCall).toBeDefined();
    });

    it('should handle special characters in quote text', async () => {
      const mockResponse = new EventEmitter() as any;
      mockHttpsGet.mockImplementation((url, callback) => {
        callback(mockResponse);
        setImmediate(() => {
          mockResponse.emit('data', Buffer.from('avatar-data'));
          mockResponse.emit('end');
        });
        return new EventEmitter();
      });

      const specialText = 'Test with émojis 🎨 and spëcial çhars!';

      const result = await ImageService.generateQuoteImage(
        'https://cdn.discordapp.com/avatars/123/abc.png',
        specialText,
        'TestUser'
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(mockFillText).toHaveBeenCalled();
    });
  });
});
