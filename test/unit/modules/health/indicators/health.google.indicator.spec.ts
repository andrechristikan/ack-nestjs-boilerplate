import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthGoogleIndicator } from '@test/unit/helpers/test.unit.health.helper';

describe('HealthGoogleIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);
    });

    describe('isHealthy', () => {
        it('reports down as not configured when the Google client id is missing', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthGoogleIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ google: { status: 'down' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('google');
            expect(session.down).toHaveBeenCalledWith(
                'Google is not configured'
            );
        });

        it('reports up when the Google client id is configured', async () => {
            const configService = buildConfigService({
                'auth.google.clientId': 'client-id',
            });
            const indicator = await createHealthGoogleIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ google: { status: 'up' } });

            const result = await indicator.isHealthy('google');

            expect(result).toEqual({ google: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });
    });
});
