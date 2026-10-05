import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';
import { DatabaseService } from '@common/database/services/database.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';

describe('HealthDatabaseIndicator', () => {
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthDatabaseIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthDatabaseIndicator,
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthDatabaseIndicator);
    });

    describe('isHealthy', () => {
        it('reports up when the ping command resolves', async () => {
            databaseService.client.$runCommandRaw.mockResolvedValue({
                ok: 1,
            });
            session.up.mockReturnValue({ database: { status: 'up' } });

            const result = await indicator.isHealthy('database');

            expect(result).toEqual({ database: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith(
                'database'
            );
            expect(databaseService.client.$runCommandRaw).toHaveBeenCalledWith({
                ping: 1,
            });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when the ping command throws an Error', async () => {
            databaseService.client.$runCommandRaw.mockRejectedValue(
                new Error('connection refused')
            );
            session.down.mockReturnValue({ database: { status: 'down' } });

            const result = await indicator.isHealthy('database');

            expect(result).toEqual({ database: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthDatabaseIndicator Failed - connection refused'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            databaseService.client.$runCommandRaw.mockRejectedValue(
                'not-an-error'
            );
            session.down.mockReturnValue({ database: { status: 'down' } });

            const result = await indicator.isHealthy('database');

            expect(result).toEqual({ database: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthDatabaseIndicator Failed - Unknown error'
            );
        });
    });
});
