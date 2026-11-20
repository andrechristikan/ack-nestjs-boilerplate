import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthCheckResult } from '@nestjs/terminus';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { HealthCheckDatabaseUseCase } from '@modules/health/use-cases/health.check-database.use-case';

describe('HealthCheckDatabaseUseCase', () => {
    const healthService: MockProxy<HealthService> = mock<HealthService>();

    const healthCheckResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
    };
    const envelope = {
        data: {
            status: EnumHealthStatus.ok,
            info: healthCheckResult.info,
            error: healthCheckResult.error,
            details: healthCheckResult.details,
        },
    };

    let useCase: HealthCheckDatabaseUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthCheckDatabaseUseCase,
                { provide: HealthService, useValue: healthService },
                HealthUtil,
            ],
        }).compile();

        useCase = module.get(HealthCheckDatabaseUseCase);
    });

    describe('execute', () => {
        it('wraps the database health check result in the response envelope', async () => {
            healthService.checkDatabase.mockResolvedValue(healthCheckResult);
            healthService.isUp.mockReturnValue(true);

            const result = await useCase.execute();

            expect(result).toEqual(envelope);
            expect(healthService.checkDatabase).toHaveBeenCalledWith();
            expect(healthService.isUp).toHaveBeenCalledWith(healthCheckResult);
        });

        it('returns the body with no metadata when the status is ok', async () => {
            healthService.checkDatabase.mockResolvedValue(healthCheckResult);
            healthService.isUp.mockReturnValue(true);

            const result = await useCase.execute();

            expect(result).not.toHaveProperty('metadata');
        });

        it.each([
            ['error', EnumHealthStatus.error],
            ['shutting_down', EnumHealthStatus.shuttingDown],
        ] as const)(
            'maps the %s result to its status and answers 503',
            async (status, mappedStatus) => {
                const result: HealthCheckResult = {
                    ...healthCheckResult,
                    status,
                };
                const data = {
                    ...envelope.data,
                    status: mappedStatus,
                };
                healthService.checkDatabase.mockResolvedValue(result);
                healthService.isUp.mockReturnValue(false);

                await expect(useCase.execute()).resolves.toEqual({
                    data,
                    metadata: {
                        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    },
                });
            }
        );
    });
});
