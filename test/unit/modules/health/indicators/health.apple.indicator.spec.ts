import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthAppleIndicator } from '@test/unit/helpers/test.unit.health.helper';

describe('HealthAppleIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);
    });

    describe('isHealthy', () => {
        it('reports down as not configured when neither Apple client id is set', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthAppleIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ apple: { status: 'down' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('apple');
            expect(session.down).toHaveBeenCalledWith(
                'Apple is not configured'
            );
        });

        it('reports up when only the Apple client id is configured', async () => {
            const configService = buildConfigService({
                'auth.apple.clientId': 'client',
            });
            const indicator = await createHealthAppleIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ apple: { status: 'up' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports up when only the Apple sign-in client id is configured', async () => {
            const configService = buildConfigService({
                'auth.apple.signInClientId': 'sign-in-client',
            });
            const indicator = await createHealthAppleIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ apple: { status: 'up' } });

            const result = await indicator.isHealthy('apple');

            expect(result).toEqual({ apple: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });
    });
});
