import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { ConfigService } from '@nestjs/config';

describe('AnalyticFraudDomain', () => {
    const cache = createMock<AnalyticCache>();
    const dateUtil = createMock<AnalyticDateUtil>();
    const configService = createMock<ConfigService>();
    const helperDateService = createMock<HelperDateService>();
    const activityDomain = createMock<ActivityLogAnalyticDomain>();
    const loginDomain = createMock<UserLoginAnalyticDomain>();
    const userDomain = createMock<UserAnalyticDomain>();
    const passwordDomain = createMock<UserPasswordAnalyticDomain>();
    const forgotPasswordDomain = createMock<UserForgotPasswordAnalyticDomain>();
    const deviceDomain = createMock<DeviceAnalyticDomain>();
    const config = new Map<string, string | number>([
        ['auth.password.maxAttempt', 5],
        ['analytic.anomaly.failedLoginSpike.nearLockoutOffset', 1],
        ['analytic.fraud.sharedFingerprint.minUsersPerFingerprint', 2],
        ['analytic.fraud.weights.nearLockout', 30],
        ['analytic.fraud.weights.sharedFingerprint', 40],
        ['analytic.fraud.weights.sessionAfterAdmin', 10],
        ['analytic.fraud.weights.impossibleTravel', 10],
        ['analytic.fraud.weights.newDeviceAfterPasswordChange', 10],
        ['analytic.fraud.weights.credentialStuffingIp', 10],
        ['analytic.fraud.weights.massRegistrationIp', 10],
        ['analytic.fraud.weights.forgotPasswordAbuse', 10],
        ['analytic.fraud.bands.monitorMax', 20],
        ['analytic.fraud.bands.reviewMax', 50],
        ['analytic.fraud.bands.elevateMax', 80],
        ['analytic.fraud.bandLabels.monitor', 'monitor'],
        ['analytic.fraud.bandLabels.review', 'review'],
        ['analytic.fraud.bandLabels.elevate', 'elevate'],
        ['analytic.fraud.bandLabels.critical', 'critical'],
    ]);

    let domain: AnalyticFraudDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        cache.getRiskScore.mockResolvedValue(null);
        configService.get.mockImplementation(key => config.get(key));
        deviceDomain.sharedFingerprints.mockResolvedValue([]);
        domain = new AnalyticFraudDomain(
            cache,
            dateUtil,
            configService,
            helperDateService,
            activityDomain,
            loginDomain,
            userDomain,
            passwordDomain,
            forgotPasswordDomain,
            deviceDomain
        );
    });

    it('returns a cached risk score without loading the user', async () => {
        const cached = {
            userId: 'user-id',
            score: 10,
            band: 'monitor',
            contributingSignalCodes: [],
        };
        cache.getRiskScore.mockResolvedValue(cached);
        await expect(domain.riskScore('user-id')).resolves.toBe(cached);
        expect(userDomain.findOneById).not.toHaveBeenCalled();
    });

    it('rejects an unknown user', async () => {
        userDomain.findOneById.mockResolvedValue(null);
        await expect(domain.riskScore('missing')).rejects.toBeInstanceOf(
            UserNotFoundException
        );
        expect(cache.setRiskScore).not.toHaveBeenCalled();
    });

    it('combines near-lockout and shared-fingerprint signals', async () => {
        userDomain.findOneById.mockResolvedValue({
            id: 'user-id',
            email: 'user@example.com',
            passwordAttempt: 4,
        });
        deviceDomain.sharedFingerprints.mockResolvedValue([
            {
                fingerprint: 'device',
                userCount: 2,
                userIds: ['user-id', 'other'],
            },
        ]);
        const expected = {
            userId: 'user-id',
            score: 70,
            band: 'elevate',
            contributingSignalCodes: ['nearLockout', 'sharedFingerprint'],
        };
        await expect(domain.riskScore('user-id')).resolves.toEqual(expected);
        expect(cache.setRiskScore).toHaveBeenCalledWith('user-id', expected);
    });

    it('returns a monitor score when no signal contributes', async () => {
        userDomain.findOneById.mockResolvedValue({
            id: 'user-id',
            email: 'user@example.com',
            passwordAttempt: null,
        });
        await expect(domain.riskScore('user-id')).resolves.toMatchObject({
            score: 0,
            band: 'monitor',
            contributingSignalCodes: [],
        });
    });
});
