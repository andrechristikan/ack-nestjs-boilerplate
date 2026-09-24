import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import { DatabaseService } from '@common/database/services/database.service';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';

describe('HealthDatabaseIndicator', () => {
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const indicatorSession: MockProxy<
        ReturnType<HealthIndicatorService['check']>
    > = mock<ReturnType<HealthIndicatorService['check']>>();

    let indicator: HealthDatabaseIndicator;

    beforeEach(async () => {
        indicatorSession.up.mockReturnValue({
            database: { status: 'up' },
        } as unknown as ReturnType<typeof indicatorSession.up>);
        indicatorSession.down.mockReturnValue({
            database: { status: 'down' },
        } as unknown as ReturnType<typeof indicatorSession.down>);
        healthIndicatorService.check.mockReturnValue(indicatorSession);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                HealthDatabaseIndicator,
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = moduleRef.get(HealthDatabaseIndicator);
    });

    it('returns up when the PostgreSQL query succeeds', async () => {
        await expect(indicator.isHealthy('database')).resolves.toEqual({
            database: { status: 'up' },
        });

        expect(healthIndicatorService.check).toHaveBeenCalledWith('database');
        expect(databaseService.client.$queryRaw).toHaveBeenCalledTimes(1);
        expect(indicatorSession.up).toHaveBeenCalledTimes(1);
    });

    it('returns down when the PostgreSQL query fails', async () => {
        databaseService.client.$queryRaw.mockRejectedValueOnce(
            new Error('connection refused')
        );

        await expect(indicator.isHealthy('database')).resolves.toEqual({
            database: { status: 'down' },
        });

        expect(indicatorSession.down).toHaveBeenCalledWith(
            'HealthDatabaseIndicator Failed - connection refused'
        );
    });

    it('uses the unknown fallback for a non-error rejection', async () => {
        databaseService.client.$queryRaw.mockRejectedValueOnce('failure');

        await expect(indicator.isHealthy('database')).resolves.toEqual({
            database: { status: 'down' },
        });
        expect(indicatorSession.down).toHaveBeenCalledWith(
            'HealthDatabaseIndicator Failed - Unknown error'
        );
    });
});
