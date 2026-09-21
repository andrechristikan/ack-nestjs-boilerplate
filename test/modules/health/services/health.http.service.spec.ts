import { ServiceUnavailableException } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { HealthCheckResult } from '@nestjs/terminus';

import { HealthDomain } from '@modules/health/domains/health.domain';
import { HealthHttpService } from '@modules/health/services/health.http.service';
import { HealthUtil } from '@modules/health/utils/health.util';

describe('HealthHttpService', () => {
    const domain: MockProxy<HealthDomain> = mock<HealthDomain>();
    const util: MockProxy<HealthUtil> = mock<HealthUtil>();
    const service = new HealthHttpService(domain, util);
    const result: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
    };

    beforeEach(() => {
        vi.resetAllMocks();
        util.mapStatus.mockReturnValue('ok' as never);
    });

    it.each([
        ['checkAws', 'checkAws'],
        ['checkDatabase', 'checkDatabase'],
        ['checkThirdParty', 'checkThirdParty'],
        ['checkInstance', 'checkInstance'],
    ] as const)('maps %s responses', async (method, domainMethod) => {
        domain[domainMethod].mockResolvedValue(result);
        await expect(service[method]()).resolves.toEqual({
            data: {
                status: 'ok',
                info: result.info,
                error: result.error,
                details: result.details,
            },
        });
    });

    it('unwraps a Terminus unavailable response', async () => {
        const error = new ServiceUnavailableException(result);
        domain.checkDatabase.mockRejectedValue(error);
        util.isHealthCheckResult.mockReturnValue(true);
        await expect(service.checkDatabase()).resolves.toEqual({
            data: expect.objectContaining({ status: 'ok' }),
        });
    });

    it('preserves an unavailable exception with a non-health response', async () => {
        const error = new ServiceUnavailableException('unavailable');
        domain.checkDatabase.mockRejectedValue(error);
        util.isHealthCheckResult.mockReturnValue(false);
        await expect(service.checkDatabase()).rejects.toBe(error);
    });

    it('preserves non-Terminus failures', async () => {
        const error = new Error('failure');
        domain.checkDatabase.mockRejectedValue(error);
        await expect(service.checkDatabase()).rejects.toBe(error);
    });
});
