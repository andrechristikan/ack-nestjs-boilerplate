import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IOnboardingCreated } from '@modules/onboarding/interfaces/onboarding.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginSocial,
} from '@modules/user/interfaces/user.interface';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAuthHttpService {
    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly onboardingDomain: OnboardingDomain,
        private readonly accountDomain: AccountDomain,
        private readonly accountLoginDomain: AccountLoginDomain,
        private readonly accountPasswordDomain: AccountPasswordDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userUtil: UserUtil,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private toDeviceIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform ?? null,
            notificationToken: device.notificationToken ?? null,
        };
    }

    private stageOnboardingActivities(
        mode: EnumUserCreateMode,
        { inputs, users }: IOnboardingCreated
    ): void {
        const stages = this.userOnboardingUtil.buildActivityStages(
            mode,
            inputs,
            users,
            null
        );
        const activityLogs = stages.map(stage =>
            this.activityLogDomain.prepare(stage)
        );

        this.activityLogDomain.stagePrepared(activityLogs);
    }

    /** Creates a fresh email verification, enqueues it, and stages its row; the caller answers the unverified gate. */
    private async sendLoginVerification(user: IUser): Promise<void> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.verificationEmail
            );
        const emailVerification =
            await this.userAuthDomain.persistLoginVerification(user);

        this.activityLogDomain.stagePrepared(activityLogs);

        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendVerificationEmail(recipient, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });
    }

    /** Answers the unverified gate, then logs the user in: tokens, or the two-factor challenge. */
    private async completeLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginOutcome> {
        if (!user.isVerified) {
            await this.sendLoginVerification(user);
        }
        this.userAuthDomain.assertVerified(user);

        const loginAt = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const loginLogs = [
            this.activityLogDomain.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const outcome = await this.accountLoginDomain.login(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        if (!outcome.isTwoFactorEnable) {
            this.activityLogDomain.stagePrepared(loginLogs);
        } else if (outcome.twoFactor.isRequiredSetup) {
            const setupLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];

            this.activityLogDomain.stagePrepared(setupLogs);
        }

        return outcome;
    }

    async loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.toDeviceIdentity(device);
        const { attempt, revoked } =
            await this.accountPasswordDomain.registerCredentialAttempt(email);
        if (revoked !== null) {
            const userId = attempt.user.id;
            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId,
                    createdBy: userId,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId,
                    createdBy: userId,
                }),
            ];
            await this.sessionQueue.purgeLogins(userId, revoked);

            this.activityLogDomain.stagePrepared(activityLogs);
        }

        this.userAuthDomain.assertAttemptCounted(attempt);

        const isMatch = await this.userAuthDomain.verifyCredential(
            attempt,
            password
        );
        if (!isMatch) {
            const failedLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: attempt.user.id,
                    createdBy: attempt.user.id,
                }),
            ];

            this.activityLogDomain.stagePrepared(failedLogs);
        }
        this.userAuthDomain.assertPasswordMatched(isMatch);

        const outcome = await this.completeLogin(
            attempt.user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential
        );

        return { data: outcome };
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            device,
            username,
            inviteToken,
            name,
            countryId,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.toDeviceIdentity(device);
        const loginSocial: IUserLoginSocial = {
            from,
            device: deviceIdentity,
            username,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            countryId,
            cookies,
            marketing,
        };
        const created = await this.onboardingDomain.signUpWithSocial(
            email,
            loginWith,
            loginSocial
        );
        if (created !== null) {
            this.stageOnboardingActivities(EnumUserCreateMode.social, created);
        }

        let user = await this.userAuthDomain.getOneForSocialLogin(email);
        if (!user.isVerified) {
            const verifiedLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            user = await this.userAuthDomain.verifyEmailBySocial(user);

            this.activityLogDomain.stagePrepared(verifiedLogs);
        }

        const outcome = await this.completeLogin(
            user,
            deviceIdentity,
            from,
            loginWith
        );
        // Sequential by design: write must not run if an earlier step throws
        if (created !== null) {
            const recipient = this.notificationUtil.mapRecipient(
                created.users[0]!,
                EnumNotificationKind.welcomeSocial,
                [],
                []
            );
            await this.notificationQueue.sendWelcomeSocial(recipient);
        }

        return { data: outcome };
    }

    async refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        const refreshLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRefreshToken,
            }),
        ];
        const reuseLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];
        const refresh = await this.accountLoginDomain.refresh(
            user,
            refreshToken
        );
        if (refresh.tokens === null) {
            await this.sessionQueue.purgeLogins(user.id, refresh.revoked);

            this.activityLogDomain.stagePrepared(reuseLogs);
        }

        const tokens = this.accountLoginDomain.getRefreshedTokens(refresh);

        this.activityLogDomain.stagePrepared(refreshLogs);

        return { data: tokens };
    }

    async signUp({
        countryId,
        email,
        username,
        password,
        inviteToken,
        name,
        from,
        cookies,
        marketing,
    }: UserSignUpRequestDto): Promise<IResponseReturn<void>> {
        const signedUp = await this.onboardingDomain.signUp({
            countryId,
            email,
            username,
            password,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            from,
            cookies,
            marketing,
        });
        this.stageOnboardingActivities(EnumUserCreateMode.signUp, signedUp);

        const recipient = this.notificationUtil.mapRecipient(
            signedUp.users[0]!,
            EnumNotificationKind.welcome,
            [],
            []
        );
        const { emailVerification } = signedUp;
        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendWelcome(recipient, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });

        return {};
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        const logoutLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userLogout,
            }),
        ];
        const revoked = await this.accountLoginDomain.logout(
            userId,
            sessionId,
            deviceOwnershipId
        );

        await this.sessionQueue.purgeLogins(userId, revoked);

        this.activityLogDomain.stagePrepared(logoutLogs);

        return {};
    }
}
