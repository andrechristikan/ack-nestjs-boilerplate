import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

vi.mock('@sentry/nestjs', () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn(),
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
    let Sentry: typeof import('@sentry/nestjs');
    let service: InstanceType<
        typeof import('@common/sentry/services/sentry.service').SentryService
    >;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        Sentry = await import('@sentry/nestjs');
        const { SentryService } =
            await import('@common/sentry/services/sentry.service');

        const module: TestingModule = await Test.createTestingModule({
            providers: [SentryService],
        }).compile();

        service = module.get(SentryService);
    });

    describe('captureException', () => {
        it('forwards the exception to Sentry', () => {
            const exception = new Error('boom');

            service.captureException(exception);

            expect(Sentry.captureException).toHaveBeenCalledWith(exception);
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

    describe('withScope', () => {
        it('forwards the callback to Sentry', () => {
            const callback = vi.fn();

            service.withScope(callback);

            expect(Sentry.withScope).toHaveBeenCalledWith(callback);
        });

        it('swallows a failure from Sentry instead of throwing', () => {
            vi.mocked(Sentry.withScope).mockImplementation(() => {
                throw new Error('sentry unreachable');
            });

            expect(() => service.withScope(vi.fn())).not.toThrow();
        });
    });
});
