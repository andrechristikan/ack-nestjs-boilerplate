import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginCredentialUseCase implements IAppUseCase<
    [UserLoginRequestDto],
    IResponseReturn<IUserLoginOutcome>
> {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userVerificationService: UserVerificationService,
        private readonly notificationService: NotificationService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly authUtil: AuthUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog = this.sessionService.getRequestLog();
        const { sessionId, jti } = this.authUtil.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtService.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.newDeviceLogin
        );
        const { isNewDevice, revoked, affected, deviceOwnershipId } =
            await this.databaseService.withTransaction(async tx => {
                const upserted = await this.deviceService.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    now
                );
                let revokedSessions: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revokedSessions =
                        await this.sessionService.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                const otherOwnershipIds =
                    await this.deviceService.getOtherOwnershipIdsByDeviceInTx(
                        tx,
                        upserted.device.id,
                        user.id
                    );
                let affectedSessions: ISessionPurgeLoginsPayload[] = [];
                if (otherOwnershipIds.length > 0) {
                    affectedSessions =
                        await this.sessionService.revokeByDeviceOwnershipIdsInTx(
                            tx,
                            otherOwnershipIds,
                            user.id,
                            now
                        );
                }
                await this.sessionService.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userService.updateLoginInTx(
                    tx,
                    user.id,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return {
                    isNewDevice: upserted.isNewDevice,
                    revoked: revokedSessions,
                    affected: affectedSessions,
                    deviceOwnershipId: upserted.deviceOwnership.id,
                };
            });

        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );
        const promises = [
            this.setLoginOrRevoke(user.id, sessionId, jti),
            this.sessionQueue.purgeLogins(user.id, revoked),
            ...affected.map(({ userId, sessions }) =>
                this.sessionQueue.purgeLogins(userId, sessions)
            ),
        ];
        if (isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const newDeviceLoginSent =
                this.notificationQueue.sendNewDeviceLogin(
                    recipient,
                    {
                        requestLog,
                        loginFrom,
                        loginWith,
                        loginAt: loginAtIso,
                    },
                    sessionId
                );
            promises.push(newDeviceLoginSent);
        }

        await Promise.all(promises);

        if (affected.length > 0) {
            const prepareRevokeLog = ({
                userId,
                sessions,
            }: ISessionPurgeLoginsPayload): IActivityLogStaged => {
                const metadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        user.id,
                        sessions.length
                    );

                return this.activityLogService.prepare({
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId,
                    createdBy: user.id,
                    metadata,
                });
            };
            this.activityLogService.stagePrepared(
                affected.map(prepareRevokeLog)
            );
        }

        return tokens;
    }

    private async setLoginOrRevoke(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        try {
            await this.sessionService.setLogin(userId, sessionId, jti);
        } catch (error: unknown) {
            const revoked = await this.sessionService.revokeIfActive(
                userId,
                sessionId
            );
            await this.sessionQueue.purgeLogins(userId, revoked);

            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(error);
        }
    }

    private async resolveLoginOutcome(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: write must not run if an earlier step throws
        const lastWorkspaceId =
            await this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            );
        const isTwoFactorEnabled = this.userUtil.isTwoFactorEnabled(user);
        if (!isTwoFactorEnabled) {
            const tokens = await this.createTokenAndSession(
                user,
                device,
                loginFrom,
                loginWith,
                loginAt
            );

            return {
                isTwoFactorEnable: false,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                tokens,
            };
        }

        const challengePromise = this.authTwoFactorService.createChallenge({
            userId: user.id,
            device,
            loginFrom,
            loginWith,
        });
        const requiresSetup = this.userUtil.requiresTwoFactorSetup(user);
        if (requiresSetup) {
            const [
                { challengeToken, expiresInMs },
                { encryptedSecret, otpauthUrl, secret },
            ] = await Promise.all([
                challengePromise,
                this.userTwoFactorService.setup(user),
            ]);
            await this.userTwoFactorService.saveSetup(user.id, encryptedSecret);

            return {
                isTwoFactorEnable: true,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining: user.twoFactor.backupCodes.length,
                    otpauthUrl,
                    secret,
                },
            };
        }

        const { challengeToken, expiresInMs } = await challengePromise;

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            twoFactor: {
                isRequiredSetup: false,
                challengeToken,
                challengeExpiresInMs: expiresInMs,
                backupCodesRemaining: user.twoFactor.backupCodes.length,
            },
        };
    }

    private async completeLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginOutcome> {
        const loginAt = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const loginLogs = [
            this.activityLogService.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const outcome = await this.resolveLoginOutcome(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        if (!outcome.isTwoFactorEnable) {
            this.activityLogService.stagePrepared(loginLogs);
        } else if (outcome.twoFactor.isRequiredSetup) {
            const setupLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];

            this.activityLogService.stagePrepared(setupLogs);
        }

        return outcome;
    }

    private async sendVerificationEmail(user: IUser): Promise<void> {
        const isResendable =
            await this.userVerificationService.isEmailResendable(user);
        if (!isResendable) {
            return;
        }

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.verificationEmail
        );
        const emailVerification =
            await this.userVerificationService.createEmail(user.id, user.email);

        this.activityLogService.stagePrepared(activityLogs);

        const payload =
            this.userVerificationUtil.mapEmailPayload(emailVerification);
        await this.notificationQueue.sendVerificationEmail(recipient, payload);
    }

    async execute({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const attempt =
            await this.userAuthService.countCredentialAttempt(email);
        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        this.userPasswordService.assertAttemptCounted(attempt.isAttemptCounted);

        const isMatch = await this.userAuthService.verifyCredential(
            attempt,
            password
        );
        if (!isMatch) {
            const failedLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: attempt.user.id,
                    createdBy: attempt.user.id,
                }),
            ];

            this.activityLogService.stagePrepared(failedLogs);
        }
        this.userAuthService.assertCredentialMatched(isMatch);

        const isUnverified = this.userUtil.isUnverified(attempt.user);
        if (isUnverified) {
            // Sequential by design: gate before the work it guards
            await this.sendVerificationEmail(attempt.user);
        }
        this.userAuthService.assertVerified(attempt.user);
        this.userAuthService.assertPasswordNotExpired(attempt.user);

        const outcome = await this.completeLogin(
            attempt.user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential
        );

        return { data: outcome };
    }
}
