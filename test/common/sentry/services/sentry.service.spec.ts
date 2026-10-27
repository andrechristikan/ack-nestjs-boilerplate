import type { Scope } from '@sentry/nestjs';
import * as Sentry from '@sentry/nestjs';
import { mock } from 'vitest-mock-extended';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { SentryService } from '@common/sentry/services/sentry.service';

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
    let service: SentryService;

    beforeEach(() => {
        service = new SentryService();
    });

    describe('captureException', () => {
        it('forwards the exception to Sentry', () => {
            const exception = new Error('boom');

            service.captureException(exception);

            expect(Sentry.captureException).toHaveBeenCalledWith(exception);
        });

        it('swallows an SDK failure without throwing', () => {
            vi.mocked(Sentry.captureException).mockImplementation(() => {
                throw new Error('sdk down');
            });

            expect(() =>
                service.captureException(new Error('x'))
            ).not.toThrow();
        });
    });

    describe('captureMessage', () => {
        it('forwards message and level to Sentry', () => {
            service.captureMessage('hello', 'warning');

            expect(Sentry.captureMessage).toHaveBeenCalledWith(
                'hello',
                'warning'
            );
        });

        it('swallows an SDK failure without throwing', () => {
            vi.mocked(Sentry.captureMessage).mockImplementation(() => {
                throw new Error('sdk down');
            });

            expect(() =>
                service.captureMessage('hello', 'error')
            ).not.toThrow();
        });
    });

    describe('log', () => {
        it.each(Object.values(EnumLoggerLevel))(
            'routes %s to the matching Sentry.logger method with attributes',
            level => {
                const attributes = { requestId: 'req-1' };

                service.log(level, 'msg', attributes);

                expect(Sentry.logger[level]).toHaveBeenCalledWith(
                    'msg',
                    attributes
                );
            }
        );

        it('passes undefined attributes when none are given', () => {
            service.log(EnumLoggerLevel.info, 'msg');

            expect(Sentry.logger.info).toHaveBeenCalledWith('msg', undefined);
        });

        it('swallows an SDK failure without throwing', () => {
            vi.mocked(Sentry.logger.error).mockImplementation(() => {
                throw new Error('sdk down');
            });

            expect(() =>
                service.log(EnumLoggerLevel.error, 'msg')
            ).not.toThrow();
        });
    });

    describe('withScope', () => {
        it('hands the callback to Sentry.withScope', () => {
            const callback = vi.fn();

            service.withScope(callback);

            expect(Sentry.withScope).toHaveBeenCalledWith(callback);
        });

        it('runs the callback with the scope Sentry provides', () => {
            const scope = mock<Scope>();
            const callback = vi.fn();
            vi.mocked(Sentry.withScope).mockImplementation(
                (...args: unknown[]) => {
                    const [cb] = args as [(scope: Scope) => void];
                    cb(scope);
                }
            );

            service.withScope(callback);

            expect(callback).toHaveBeenCalledWith(scope);
        });

        it('swallows an SDK failure without throwing', () => {
            vi.mocked(Sentry.withScope).mockImplementation(() => {
                throw new Error('sdk down');
            });

            expect(() => service.withScope(vi.fn())).not.toThrow();
        });
    });
});
