import dotenv from 'dotenv';
import { vi } from 'vitest';

dotenv.config({ path: '.env.e2e' });
dotenv.config();

process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';

// `.env.e2e` ships no `SENTRY_DSN`, so `src/instrument.ts` never calls `Sentry.init` for this
// profile already — but `SentryService` (`src/common/sentry/services/sentry.service.ts`) and
// `HealthSentryIndicator` (`src/modules/health/indicators/health.sentry.indicator.ts`) still
// import `@sentry/nestjs` directly and call it on every exception an e2e spec provokes. This
// stubs every export either of them touches, so no e2e run ever reaches the real SDK
// regardless of env state. Mirrors the mock shape in
// `test/common/sentry/services/sentry.service.spec.ts`, plus `getClient`.
vi.mock('@sentry/nestjs', () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn(),
    getClient: vi.fn(() => undefined),
    logger: {
        fatal: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
    },
}));
