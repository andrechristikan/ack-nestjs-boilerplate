import { HealthIndicatorService } from '@nestjs/terminus';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { createHealthGithubIndicator } from '@test/unit/helpers/test.unit.health.helper';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';

describe('HealthGithubIndicator', () => {
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);
    });

    describe('isHealthy', () => {
        it('reports down as not configured when neither GitHub key is set', async () => {
            const configService = buildConfigService({});
            const indicator = await createHealthGithubIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ github: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.github
            );

            expect(result).toEqual({ github: { status: 'down' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('github');
            expect(session.down).toHaveBeenCalledWith(
                'GitHub is not configured'
            );
        });

        it('reports down as not configured when only the GitHub client id is set', async () => {
            const configService = buildConfigService({
                'auth.github.clientId': 'client',
            });
            const indicator = await createHealthGithubIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ github: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.github
            );

            expect(result).toEqual({ github: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'GitHub is not configured'
            );
        });

        it('reports down as not configured when only the GitHub client secret is set', async () => {
            const configService = buildConfigService({
                'auth.github.clientSecret': 'secret',
            });
            const indicator = await createHealthGithubIndicator(
                configService,
                healthIndicatorService
            );
            session.down.mockReturnValue({ github: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.github
            );

            expect(result).toEqual({ github: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'GitHub is not configured'
            );
        });

        it('reports up when the GitHub client id and client secret are set', async () => {
            const configService = buildConfigService({
                'auth.github.clientId': 'client',
                'auth.github.clientSecret': 'secret',
            });
            const indicator = await createHealthGithubIndicator(
                configService,
                healthIndicatorService
            );
            session.up.mockReturnValue({ github: { status: 'up' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.github
            );

            expect(result).toEqual({ github: { status: 'up' } });
            expect(session.up).toHaveBeenCalledWith();
        });
    });
});
