import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthCheckResult } from '@nestjs/terminus';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { HealthCheckAwsUseCase } from '@modules/health/use-cases/health.check-aws.use-case';

describe('HealthCheckAwsUseCase', () => {
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

    let useCase: HealthCheckAwsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthUtil.toResponse.mockReturnValue(envelope.data);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthCheckAwsUseCase,
                { provide: HealthService, useValue: healthService },
                { provide: HealthUtil, useValue: healthUtil },
            ],
        }).compile();

        useCase = module.get(HealthCheckAwsUseCase);
    });

    describe('execute', () => {
        it('wraps the AWS health check result in the response envelope', async () => {
            healthService.checkAws.mockResolvedValue(healthCheckResult);

            const result = await useCase.execute();

            expect(result).toEqual(envelope);
            expect(healthService.checkAws).toHaveBeenCalledWith();
        });

        it('lets a domain error propagate unchanged', async () => {
            const error = new AppUnknownException(new Error('crashed'));
            healthService.checkAws.mockRejectedValue(error);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});
