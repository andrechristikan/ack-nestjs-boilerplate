import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

vi.mock('@sentry/nestjs', () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    logger: {
        fatal: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
    },
}));

describe('SentryService', () => {
    let service: SentryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SentryService],
        }).compile();

        service = module.get(SentryService);
    });

    describe('captureException', () => {
        it('forwards the exception to Sentry', () => {
            const exception = new Error('boom');

            service.captureException(exception);

            expect(Sentry.captureException).toHaveBeenCalledWith(
                exception,
                undefined
            );
        });

        it('forwards the capture context to Sentry', () => {
            const exception = new Error('boom');
            const captureContext = { tags: { source: 'queue' } };

            service.captureException(exception, captureContext);

            expect(Sentry.captureException).toHaveBeenCalledWith(
                exception,
                captureContext
            );
        });

        it('swallows a failure from Sentry instead of throwing', () => {
            vi.mocked(Sentry.captureException).mockImplementation(() => {
                throw new Error('sentry unreachable');
            });

            expect(() =>
                service.captureException(new Error('boom'))
            ).not.toThrow();
        });
    });

    describe('captureMessage', () => {
        it('forwards the message and level to Sentry', () => {
            service.captureMessage('hello', 'info');

            expect(Sentry.captureMessage).toHaveBeenCalledWith('hello', 'info');
        });

        it('swallows a failure from Sentry instead of throwing', () => {
            vi.mocked(Sentry.captureMessage).mockImplementation(() => {
                throw new Error('sentry unreachable');
            });

            expect(() => service.captureMessage('hello', 'info')).not.toThrow();
        });
    });

    describe('log', () => {
        it('forwards the level, message and attributes to Sentry logger', () => {
            service.log(EnumLoggerLevel.info, 'hello', { userId: '1' });

            expect(Sentry.logger.info).toHaveBeenCalledWith('hello', {
                userId: '1',
            });
        });

        it('swallows a failure from Sentry instead of throwing', () => {
            vi.mocked(Sentry.logger.error).mockImplementation(() => {
                throw new Error('sentry unreachable');
            });

            expect(() =>
                service.log(EnumLoggerLevel.error, 'hello')
            ).not.toThrow();
        });
    });
});
