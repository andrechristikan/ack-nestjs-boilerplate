import type { Scope } from '@sentry/nestjs';
import type { MockProxy } from 'vitest-mock-extended';
import type { SentryService } from '@common/sentry/services/sentry.service';

export function stubSentryScope(
    sentryService: MockProxy<SentryService>
): Scope {
    const scope = { setAttribute: vi.fn() } as unknown as Scope;

    sentryService.withScope.mockImplementation(callback => {
        callback(scope);
    });

    return scope;
}
