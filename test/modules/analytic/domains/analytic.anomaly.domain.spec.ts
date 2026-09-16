import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { ConfigService } from '@nestjs/config';

describe('AnalyticAnomalyDomain', () => {
    const cache = createMock<AnalyticCache>();
    const dateUtil = createMock<AnalyticDateUtil>();
    const geoUtil = createMock<AnalyticGeoUtil>();
    const configService = createMock<ConfigService>();
    const dateService = createMock<HelperDateService>();
    const sessionDomain = createMock<SessionAnalyticDomain>();
    const userDomain = createMock<UserAnalyticDomain>();
    const loginDomain = createMock<UserLoginAnalyticDomain>();
    const deviceDomain = createMock<DeviceAnalyticDomain>();
    const config = new Map<string, number>([
        ['auth.password.maxAttempt', 5],
        ['analytic.anomaly.failedLoginSpike.nearLockoutOffset', 2],
        ['analytic.anomaly.deviceProliferation.zScoreThreshold', 2.5],
    ]);

    let domain: AnalyticAnomalyDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        cache.getAnomalySummary.mockResolvedValue(null);
        configService.get.mockImplementation(key => config.get(key));
        domain = new AnalyticAnomalyDomain(
            cache,
            dateUtil,
            geoUtil,
            configService,
            dateService,
            sessionDomain,
            userDomain,
            loginDomain,
            deviceDomain
        );
    });

    it('returns a cached failed-login summary without recomputing', async () => {
        const cached = { count: 4 };
        cache.getAnomalySummary.mockResolvedValue(cached);
        await expect(domain.failedLoginSpikeSummary()).resolves.toBe(cached);
        expect(userDomain.findNearLockout).not.toHaveBeenCalled();
    });

    it('summarizes users near the configured lockout threshold', async () => {
        userDomain.groupPasswordAttemptBuckets.mockResolvedValue([
            { key: '3', count: 2 },
        ]);
        userDomain.findNearLockout.mockResolvedValue([
            { id: 'user-id', email: 'user@example.com', passwordAttempt: 4 },
        ]);
        const expected = {
            count: 1,
            meta: { nearLockoutMinAttempt: 3, bucketCount: 1 },
        };
        await expect(domain.failedLoginSpikeSummary()).resolves.toEqual(
            expected
        );
        expect(userDomain.findNearLockout).toHaveBeenCalledWith(3);
        expect(cache.setAnomalySummary).toHaveBeenCalledWith(
            'failed-login-spike',
            '_',
            expected
        );
    });

    it('forwards the lockout threshold and pagination for the list', async () => {
        const params = { skip: 0, limit: 10, filter: {}, order: {} };
        await domain.failedLoginSpikeList(params);
        expect(userDomain.listNearLockoutOffset).toHaveBeenCalledWith(
            3,
            params
        );
    });

    it('summarizes device proliferation using the configured z-score', async () => {
        deviceDomain.proliferationOutliers.mockResolvedValue({
            count: 2,
            avg: 1.5,
            stdDev: 0.5,
            rows: [],
        });
        await expect(domain.deviceProliferationSummary()).resolves.toEqual({
            count: 2,
            meta: { avg: 1.5, stdDev: 0.5, zScoreThreshold: 2.5 },
        });
        expect(deviceDomain.proliferationOutliers).toHaveBeenCalledWith(2.5);
    });
});
