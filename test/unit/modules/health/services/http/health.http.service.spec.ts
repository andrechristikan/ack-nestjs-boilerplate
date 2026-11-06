import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HealthCheckResult } from '@nestjs/terminus';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthDomain } from '@modules/health/domains/health.domain';
import { HealthHttpService } from '@modules/health/services/http/health.http.service';
import { HealthUtil } from '@modules/health/utils/health.util';

describe('HealthHttpService', () => {
    const healthDomain: MockProxy<HealthDomain> = mock<HealthDomain>();
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

    let service: HealthHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthUtil.toResponse.mockReturnValue(envelope.data);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthHttpService,
                { provide: HealthDomain, useValue: healthDomain },
                { provide: HealthUtil, useValue: healthUtil },
            ],
        }).compile();

        service = module.get(HealthHttpService);
    });

    describe('checkAws', () => {
        it('wraps the AWS health check result in the response envelope', async () => {
            healthDomain.checkAws.mockResolvedValue(healthCheckResult);

            const result = await service.checkAws();

            expect(result).toEqual(envelope);
            expect(healthDomain.checkAws).toHaveBeenCalledWith();
        });

        it('lets a domain error propagate unchanged', async () => {
            const error = new AppUnknownException(new Error('crashed'));
            healthDomain.checkAws.mockRejectedValue(error);

            await expect(service.checkAws()).rejects.toBe(error);
        });
    });

    describe('checkDatabase', () => {
        it('wraps the database health check result in the response envelope', async () => {
            healthDomain.checkDatabase.mockResolvedValue(healthCheckResult);

            const result = await service.checkDatabase();

            expect(result).toEqual(envelope);
            expect(healthDomain.checkDatabase).toHaveBeenCalledWith();
        });

        it('maps the result through HealthUtil', async () => {
            const result: HealthCheckResult = {
                ...healthCheckResult,
                status: 'error',
            };
            const data = { ...envelope.data, status: EnumHealthStatus.error };
            healthDomain.checkDatabase.mockResolvedValue(result);
            healthUtil.toResponse.mockReturnValue(data);

            await expect(service.checkDatabase()).resolves.toEqual({ data });
            expect(healthUtil.toResponse).toHaveBeenCalledWith(result);
        });
    });

    describe('checkThirdParty', () => {
        it('wraps the third-party health check result in the response envelope', async () => {
            healthDomain.checkThirdParty.mockResolvedValue(healthCheckResult);

            const result = await service.checkThirdParty();

            expect(result).toEqual(envelope);
            expect(healthDomain.checkThirdParty).toHaveBeenCalledWith();
        });
    });

    describe('checkInstance', () => {
        it('wraps the instance health check result in the response envelope', async () => {
            healthDomain.checkInstance.mockResolvedValue(healthCheckResult);

            const result = await service.checkInstance();

            expect(result).toEqual(envelope);
            expect(healthDomain.checkInstance).toHaveBeenCalledWith();
        });
    });
});
