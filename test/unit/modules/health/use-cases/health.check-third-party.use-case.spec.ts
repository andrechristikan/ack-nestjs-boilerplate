import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthCheckResult } from '@nestjs/terminus';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { HealthCheckThirdPartyUseCase } from '@modules/health/use-cases/health.check-third-party.use-case';

describe('HealthCheckThirdPartyUseCase', () => {
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

    let useCase: HealthCheckThirdPartyUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthUtil.toResponse.mockReturnValue(envelope.data);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthCheckThirdPartyUseCase,
                { provide: HealthService, useValue: healthService },
                { provide: HealthUtil, useValue: healthUtil },
            ],
        }).compile();

        useCase = module.get(HealthCheckThirdPartyUseCase);
    });

    describe('execute', () => {
        it('wraps the third-party health check result in the response envelope', async () => {
            healthService.checkThirdParty.mockResolvedValue(healthCheckResult);

            const result = await useCase.execute();

            expect(result).toEqual(envelope);
            expect(healthService.checkThirdParty).toHaveBeenCalledWith();
        });
    });
});
