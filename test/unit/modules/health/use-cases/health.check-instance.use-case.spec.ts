import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthCheckResult } from '@nestjs/terminus';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { HealthCheckInstanceUseCase } from '@modules/health/use-cases/health.check-instance.use-case';

describe('HealthCheckInstanceUseCase', () => {
    const healthService: MockProxy<HealthService> = mock<HealthService>();
    const healthUtil: MockProxy<HealthUtil> = mock<HealthUtil>();

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

    let useCase: HealthCheckInstanceUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthUtil.toResponse.mockReturnValue(envelope.data);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthCheckInstanceUseCase,
                { provide: HealthService, useValue: healthService },
                { provide: HealthUtil, useValue: healthUtil },
            ],
        }).compile();

        useCase = module.get(HealthCheckInstanceUseCase);
    });

    describe('execute', () => {
        it('wraps the instance health check result in the response envelope', async () => {
            healthService.checkInstance.mockResolvedValue(healthCheckResult);

            const result = await useCase.execute();

            expect(result).toEqual(envelope);
            expect(healthService.checkInstance).toHaveBeenCalledWith();
        });
    });
});
