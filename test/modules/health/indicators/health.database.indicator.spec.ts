import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '@common/database/services/database.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';

describe('HealthDatabaseIndicator', () => {
    const databaseService = createMock<DatabaseService>();
    const healthIndicatorService = createMock<HealthIndicatorService>();
    const up = vi.fn(() => ({ database: { status: 'up' as const } }));
    const down = vi.fn(() => ({ database: { status: 'down' as const } }));
    const indicatorSession = { up, down } as unknown as ReturnType<
        HealthIndicatorService['check']
    >;
    let indicator: HealthDatabaseIndicator;

    beforeEach(() => {
        databaseService.client.$queryRaw.mockReset();
        healthIndicatorService.check.mockReset();
        healthIndicatorService.check.mockReturnValue(indicatorSession);
        indicator = new HealthDatabaseIndicator(
            databaseService,
            healthIndicatorService
        );
    });

    it('returns up when the PostgreSQL query succeeds', async () => {
        await expect(indicator.isHealthy('database')).resolves.toEqual({
            database: { status: 'up' },
        });

        expect(healthIndicatorService.check).toHaveBeenCalledWith('database');
        expect(databaseService.client.$queryRaw).toHaveBeenCalledTimes(1);
        expect(up).toHaveBeenCalledTimes(1);
    });

    it('returns down when the PostgreSQL query fails', async () => {
        vi.mocked(databaseService.client.$queryRaw).mockRejectedValueOnce(
            new Error('connection refused')
        );

        await expect(indicator.isHealthy('database')).resolves.toEqual({
            database: { status: 'down' },
        });

        expect(down).toHaveBeenCalledWith(
            'HealthDatabaseIndicator Failed - connection refused'
        );
    });
});
