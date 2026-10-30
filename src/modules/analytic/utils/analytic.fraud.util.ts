import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type { IActivityLogAnalyticList } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IAnalyticFraudRiskScore,
    IAnalyticFraudSignalRows,
    IAnalyticFraudSignalUsers,
    IAnalyticFraudUserCount,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IUserAnalyticRef } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticFraudUtil {
    private readonly weightSessionAfterAdmin: number;
    private readonly weightImpossibleTravel: number;
    private readonly weightNewDeviceAfterPasswordChange: number;
    private readonly weightCredentialStuffingIp: number;
    private readonly weightSharedFingerprint: number;
    private readonly weightNearLockout: number;
    private readonly weightMassRegistrationIp: number;
    private readonly weightForgotPasswordAbuse: number;
    private readonly nearLockoutAttempt: number;
    private readonly bandMonitorMax: number;
    private readonly bandReviewMax: number;
    private readonly bandElevateMax: number;

    constructor(private readonly configService: ConfigService) {
        this.weightSessionAfterAdmin = this.configService.get<number>(
            'analytic.fraud.weights.sessionAfterAdmin'
        )!;
        this.weightImpossibleTravel = this.configService.get<number>(
            'analytic.fraud.weights.impossibleTravel'
        )!;
        this.weightNewDeviceAfterPasswordChange =
            this.configService.get<number>(
                'analytic.fraud.weights.newDeviceAfterPasswordChange'
            )!;
        this.weightCredentialStuffingIp = this.configService.get<number>(
            'analytic.fraud.weights.credentialStuffingIp'
        )!;
        this.weightSharedFingerprint = this.configService.get<number>(
            'analytic.fraud.weights.sharedFingerprint'
        )!;
        this.weightNearLockout = this.configService.get<number>(
            'analytic.fraud.weights.nearLockout'
        )!;
        this.weightMassRegistrationIp = this.configService.get<number>(
            'analytic.fraud.weights.massRegistrationIp'
        )!;
        this.weightForgotPasswordAbuse = this.configService.get<number>(
            'analytic.fraud.weights.forgotPasswordAbuse'
        )!;
        const passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const nearLockoutOffset = this.configService.get<number>(
            'analytic.anomaly.failedLoginSpike.nearLockoutOffset'
        )!;
        this.nearLockoutAttempt = passwordMaxAttempt - nearLockoutOffset;
        this.bandMonitorMax = this.configService.get<number>(
            'analytic.fraud.bands.monitorMax'
        )!;
        this.bandReviewMax = this.configService.get<number>(
            'analytic.fraud.bands.reviewMax'
        )!;
        this.bandElevateMax = this.configService.get<number>(
            'analytic.fraud.bands.elevateMax'
        )!;
    }

    resolveBand(score: number): EnumAnalyticFraudBand {
        if (score <= this.bandMonitorMax) {
            return EnumAnalyticFraudBand.monitor;
        }
        if (score <= this.bandReviewMax) {
            return EnumAnalyticFraudBand.review;
        }
        if (score <= this.bandElevateMax) {
            return EnumAnalyticFraudBand.elevate;
        }

        return EnumAnalyticFraudBand.critical;
    }

    score(
        user: IUserAnalyticRef,
        signals: IAnalyticFraudSignalUsers
    ): IAnalyticFraudRiskScore {
        const checks = [
            {
                signal: EnumAnalyticFraudContributingSignal.sessionAfterAdmin,
                weight: this.weightSessionAfterAdmin,
                hit: signals.sessionAfterAdmin.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.impossibleTravel,
                weight: this.weightImpossibleTravel,
                hit: signals.impossibleTravel.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
                weight: this.weightNewDeviceAfterPasswordChange,
                hit: signals.newDeviceAfterPasswordChange.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.credentialStuffingIp,
                weight: this.weightCredentialStuffingIp,
                hit: signals.credentialStuffingIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.sharedFingerprint,
                weight: this.weightSharedFingerprint,
                hit: signals.sharedFingerprint.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.nearLockout,
                weight: this.weightNearLockout,
                hit: (user.passwordAttempt ?? 0) >= this.nearLockoutAttempt,
            },
            {
                signal: EnumAnalyticFraudContributingSignal.massRegistrationIp,
                weight: this.weightMassRegistrationIp,
                hit: signals.massRegistrationIp.has(user.id),
            },
            {
                signal: EnumAnalyticFraudContributingSignal.forgotPasswordAbuse,
                weight: this.weightForgotPasswordAbuse,
                hit: signals.forgotPasswordAbuse.has(user.id),
            },
        ];

        const contributingSignalCodes: EnumAnalyticFraudContributingSignal[] =
            [];
        let score = 0;
        for (const check of checks) {
            if (check.hit) {
                score += check.weight;
                contributingSignalCodes.push(check.signal);
            }
        }

        const band = this.resolveBand(score);

        return { userId: user.id, score, band, contributingSignalCodes };
    }

    countByUser(
        activityLogs: IActivityLogAnalyticList[],
        minCount: number
    ): IAnalyticFraudUserCount[] {
        const counts = new Map<string, number>();
        for (const activityLog of activityLogs) {
            counts.set(
                activityLog.userId,
                (counts.get(activityLog.userId) ?? 0) + 1
            );
        }

        return [...counts.entries()]
            .filter(([, count]) => count >= minCount)
            .map(([userId, count]) => ({ userId, count }));
    }

    toSignalUsers(rows: IAnalyticFraudSignalRows): IAnalyticFraudSignalUsers {
        return {
            sessionAfterAdmin: new Set(
                rows.sessionAfterAdmin.map(row => row.userId)
            ),
            impossibleTravel: new Set(rows.impossibleTravelUserIds),
            newDeviceAfterPasswordChange: new Set(
                rows.accountTakeover.map(row => row.userId)
            ),
            credentialStuffingIp: rows.credentialStuffingUserIds,
            sharedFingerprint: new Set(
                rows.sharedFingerprint.flatMap(row => row.userIds)
            ),
            massRegistrationIp: rows.massRegistrationUserIds,
            forgotPasswordAbuse: new Set(
                rows.forgotPasswordAbuse.map(row => row.userId)
            ),
        };
    }

    collectCandidateIds(
        signals: IAnalyticFraudSignalUsers,
        nearLockout: IAnalyticNearLockout[],
        limit: number
    ): string[] {
        return [
            ...new Set([
                ...signals.sessionAfterAdmin,
                ...signals.impossibleTravel,
                ...signals.newDeviceAfterPasswordChange,
                ...signals.credentialStuffingIp,
                ...signals.sharedFingerprint,
                ...nearLockout.map(user => user.id),
                ...signals.massRegistrationIp,
                ...signals.forgotPasswordAbuse,
            ]),
        ].slice(0, limit);
    }
}
