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

        it('maps the health result Terminus reports through ServiceUnavailableException', async () => {
            healthDomain.checkAws.mockRejectedValue(
                new ServiceUnavailableException(healthCheckResult)
            );
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = await service.checkAws();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.error,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
        });

        it('wraps an unexpected error in AppUnknownException', async () => {
            const error = new Error('indicator crashed');
            healthDomain.checkAws.mockRejectedValue(error);

            await expect(service.checkAws()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('maps the health result Terminus reports through ServiceUnavailableException', async () => {
            healthDomain.checkDatabase.mockRejectedValue(
                new ServiceUnavailableException(healthCheckResult)
            );
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = await service.checkDatabase();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.error,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
        });

        it('wraps an unexpected error in AppUnknownException', async () => {
            const error = new Error('indicator crashed');
            healthDomain.checkDatabase.mockRejectedValue(error);

            await expect(service.checkDatabase()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('maps the health result Terminus reports through ServiceUnavailableException', async () => {
            healthDomain.checkThirdParty.mockRejectedValue(
                new ServiceUnavailableException(healthCheckResult)
            );
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = await service.checkThirdParty();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.error,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
        });

        it('wraps an unexpected error in AppUnknownException', async () => {
            const error = new Error('indicator crashed');
            healthDomain.checkThirdParty.mockRejectedValue(error);

            await expect(service.checkThirdParty()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('maps the health result Terminus reports through ServiceUnavailableException', async () => {
            healthDomain.checkInstance.mockRejectedValue(
                new ServiceUnavailableException(healthCheckResult)
            );
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = await service.checkInstance();

            expect(result).toEqual({
                data: {
                    status: EnumHealthStatus.error,
                    info: healthCheckResult.info,
                    error: healthCheckResult.error,
                    details: healthCheckResult.details,
                },
            });
        });

        it('wraps an unexpected error in AppUnknownException', async () => {
            const error = new Error('indicator crashed');
            healthDomain.checkInstance.mockRejectedValue(error);

            await expect(service.checkInstance()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('resolveFailure', () => {
        it('wraps an error that is not a ServiceUnavailableException in AppUnknownException', () => {
            const error = new Error('indicator crashed');

            expect(() => service['resolveFailure'](error)).toThrow(
                expect.objectContaining({
                    constructor: AppUnknownException,
                    rawError: error,
                })
            );
        });

        it('rethrows a ServiceUnavailableException whose response is not a health check result', () => {
            const error = new ServiceUnavailableException('unavailable');
            healthUtil.isHealthCheckResult.mockReturnValue(false);

            expect(() => service['resolveFailure'](error)).toThrow(error);
            expect(healthUtil.isHealthCheckResult).toHaveBeenCalledWith(
                error.getResponse()
            );
        });

        it('maps a ServiceUnavailableException whose response is a health check result', () => {
            const error = new ServiceUnavailableException(healthCheckResult);
            healthUtil.isHealthCheckResult.mockReturnValue(true);
            healthUtil.mapStatus.mockReturnValue(EnumHealthStatus.error);

            const result = service['resolveFailure'](error);

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
