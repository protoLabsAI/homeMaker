// Middleware setup: Helmet, Morgan, CORS, Prometheus, cookie-parser, raw body, rate limiting

import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import express, { type Request, type Response } from 'express';
import type { Express } from 'express';
import { prometheusMiddleware } from '../lib/prometheus.js';

/** Express request extended with raw body buffer for webhook signature verification */
interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

const ENABLE_REQUEST_LOGGING_DEFAULT = process.env.ENABLE_REQUEST_LOGGING !== 'false';

// Runtime-configurable request logging flag (can be changed via settings)
let requestLoggingEnabled = ENABLE_REQUEST_LOGGING_DEFAULT;

/**
 * Enable or disable HTTP request logging at runtime
 */
export function setRequestLoggingEnabled(enabled: boolean): void {
  requestLoggingEnabled = enabled;
}

/**
 * Get current request logging state
 */
export function isRequestLoggingEnabled(): boolean {
  return requestLoggingEnabled;
}

/** Standard 429 response body for all rate limiters */
const RATE_LIMIT_RESPONSE = { success: false, error: 'Too many requests' } as const;

/**
 * Register all Express middleware: helmet, logging, CORS, Prometheus, body parsing
 */
export function setupMiddleware(app: Express, options?: { allowAllOrigins?: boolean }): void {
  // Security headers via helmet (must be early in the chain)
  app.use(helmet());

  // Custom colored logger showing only endpoint and status code (dynamically configurable)
  morgan.token('status-colored', (_req, res) => {
    const status = res.statusCode;
    if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // Red for server errors
    if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // Yellow for client errors
    if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // Cyan for redirects
    return `\x1b[32m${status}\x1b[0m`; // Green for success
  });

  app.use(
    morgan(':method :url :status-colored', {
      // Skip when request logging is disabled or for health check endpoints
      skip: (req) => !requestLoggingEnabled || req.url === '/api/health',
    })
  );

  // Prometheus metrics middleware (must be before routes)
  app.use(prometheusMiddleware);

  // CORS configuration
  // When using credentials (cookies), origin cannot be '*'
  // We dynamically allow the requesting origin for local development
  const allowAllOrigins = options?.allowAllOrigins === true;
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Electron)
        if (!origin) {
          callback(null, true);
          return;
        }

        // When hivemind is enabled, accept requests from any origin
        if (allowAllOrigins) {
          callback(null, origin);
          return;
        }

        // If CORS_ORIGIN is set, use it (can be comma-separated list)
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
        if (allowedOrigins && allowedOrigins.length > 0 && allowedOrigins[0] !== '*') {
          if (allowedOrigins.includes(origin)) {
            callback(null, origin);
            return;
          }
          // Fall through to hostname allowlist below
        }

        // For local development, allow all localhost/loopback origins (any port)
        try {
          const url = new URL(origin);
          const hostname = url.hostname;

          // Allow Chrome extension origins (extension ID varies per installation)
          if (url.protocol === 'chrome-extension:') {
            callback(null, origin);
            return;
          }

          if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname === '0.0.0.0' ||
            hostname === 'ava' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')
          ) {
            callback(null, origin);
            return;
          }
        } catch (_err) {
          // Ignore URL parsing errors
        }

        // Reject other origins by default for security
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Preserve raw body for webhook signature verification
  // This middleware must be before express.json()
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: RequestWithRawBody, _res: Response, buf: Buffer) => {
        // Store raw body for routes that need it (e.g., webhook signature verification)
        req.rawBody = buf;
      },
    })
  );
  app.use(cookieParser());
}

// ---------------------------------------------------------------------------
// Rate limiters — exported for use in routes.ts
// ---------------------------------------------------------------------------

/** Helper to build a rate limiter with consistent 429 response format */
function createRateLimiter(options: {
  windowMs: number;
  limit: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    skip: options.skip,
    message: RATE_LIMIT_RESPONSE,
    validate: { ipKeyGenerator: false },
  });
}

/** General API rate limiter: 300 req/min per IP (skips health + setup endpoints) */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 300,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/health/') ||
    req.path.startsWith('/setup/') ||
    req.path === '/settings/status',
});

/** Vault read limiter: 30 req/min per IP */
export const vaultReadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 30,
});

/** Vault write limiter: 10 req/min per IP */
export const vaultWriteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
});

/**
 * Sensor report limiter: 120 req/min keyed on sensor ID.
 * Attempts to extract sensor ID from body or X-Sensor-Id header, falls back to IP.
 */
export const sensorReportRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req: Request): string => {
    const body = req.body as Record<string, unknown> | undefined;
    const sensorIdFromBody = body?.sensorId;
    if (typeof sensorIdFromBody === 'string' && sensorIdFromBody.length > 0) {
      return `sensor:${sensorIdFromBody}`;
    }
    const sensorIdFromHeader = req.headers['x-sensor-id'];
    if (typeof sensorIdFromHeader === 'string' && sensorIdFromHeader.length > 0) {
      return `sensor:${sensorIdFromHeader}`;
    }
    // Use the built-in IP key generator for proper IPv6 handling
    return req.ip ?? '127.0.0.1';
  },
});
