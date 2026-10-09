import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ServiceUnavailableException } from '@nestjs/common';
import type { HealthCheckResult } from '@nestjs/terminus';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthDomain } from '@modules/health/domains/health.domain';
import { HealthHttpService } from '@modules/health/services/health.http.service';
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

    let service: HealthHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

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
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.ok);

            const result = await service.checkAws();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.ok,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
            expect(healthDomain.checkAws).toHaveBeenCalledWith();
        });
    });

    describe('checkDatabase', () => {
        it('wraps the database health check result in the response envelope', async () => {
            healthDomain.checkDatabase.mockResolvedValue(healthCheckResult);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.ok);

            const result = await service.checkDatabase();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.ok,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
            expect(healthDomain.checkDatabase).toHaveBeenCalledWith();
        });
    });

    describe('checkThirdParty', () => {
        it('wraps the third-party health check result in the response envelope', async () => {
            healthDomain.checkThirdParty.mockResolvedValue(healthCheckResult);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.ok);

            const result = await service.checkThirdParty();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.ok,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
            expect(healthDomain.checkThirdParty).toHaveBeenCalledWith();
        });
    });

    describe('checkInstance', () => {
        it('wraps the instance health check result in the response envelope', async () => {
            healthDomain.checkInstance.mockResolvedValue(healthCheckResult);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.ok);

            const result = await service.checkInstance();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.ok,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
            expect(healthDomain.checkInstance).toHaveBeenCalledWith();
        });
    });

    describe('resolveResponse', () => {
        it('maps the resolved health check result', async () => {
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.ok);

            const result = await service['resolveResponse'](
                Promise.resolve(healthCheckResult)
            );

            expect(result).toEqual({
                status: EnumHealthStatus.ok,
                info: healthCheckResult.info,
                error: healthCheckResult.error,
                details: healthCheckResult.details,
            });
        });

        it('wraps an error that is not a ServiceUnavailableException in AppUnknownException', async () => {
            const error = new Error('indicator crashed');

            await expect(
                service['resolveResponse'](Promise.reject(error))
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });

        it('rethrows a ServiceUnavailableException whose response is not a health check result', async () => {
            const error = new ServiceUnavailableException('unavailable');
            healthUtil.isHealthCheckResult.mockReturnValue(false);

            await expect(
                service['resolveResponse'](Promise.reject(error))
            ).rejects.toBe(error);
            expect(healthUtil.isHealthCheckResult).toHaveBeenCalledWith(
                error.getResponse()
            );
        });

        it('maps a ServiceUnavailableException whose response is a health check result', async () => {
            const error = new ServiceUnavailableException(healthCheckResult);
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = await service['resolveResponse'](
                Promise.reject(error)
            );

            expect(result).toEqual({
                status: EnumHealthStatus.error,
                info: healthCheckResult.info,
                error: healthCheckResult.error,
                details: healthCheckResult.details,
            });
        });
    });

    describe('mapResponse', () => {
        it('maps the Terminus status through HealthUtil and passes info, error, and details through', () => {
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.degraded);

            const result = service['mapResponse'](healthCheckResult);

            expect(result).toEqual({
                status: EnumHealthStatus.degraded,
                info: healthCheckResult.info,
                error: healthCheckResult.error,
                details: healthCheckResult.details,
            });
            expect(healthUtil.mapStatus).toHaveBeenCalledWith('ok');
        });
    });
});
