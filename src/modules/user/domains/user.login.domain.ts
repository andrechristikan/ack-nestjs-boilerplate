import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import type {
    IUser,
    IUserLoginOutcome,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

/** Owns the login lifecycle: the token and session pair, the two-factor challenge and the session revocation. */
@Injectable()
export class UserLoginDomain {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userUtil: UserUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly deviceUtil: DeviceUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly authJwtDomain: AuthJwtDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly authCache: AuthCache,
        private readonly sessionCache: SessionCache,
        private readonly sessionDomain: SessionDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private async assertTwoFactorUnlocked(user: IUser): Promise<void> {
        const retryAfterMs = await this.authCache.getLockTwoFactorAttempt(user);
        if (retryAfterMs > 0) {
            throw new AuthTwoFactorAttemptTemporaryLockException(
                retryAfterMs / 1000
            );
        }
    }

    private async recordTwoFactorFailure(user: IUser): Promise<void> {
        const attempted =
            await this.userTwoFactorRepository.increaseTwoFactorAttempt(
                user.id
            );
        user.twoFactor = {
            ...attempted,
            backupCodes: user.twoFactor?.backupCodes ?? [],
        };

        const isTwoFactorAttemptMaxed =
            this.authTwoFactorDomain.checkAttempt(user);
        if (isTwoFactorAttemptMaxed) {
            await this.authCache.lockTwoFactorAttempt(user);
        }
    }

    async assertWorkspaceInvitationAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
    }

    async recordLoginFailed(userId: string): Promise<void> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userLoginFailed,
                userId,
                createdBy: userId,
                onError: true,
            }),
        ];
        await this.userRepository.increasePasswordAttempt(userId);

        this.activityLogDomain.stagePrepared(events);
    }

    async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const { tokens, sessionId, jti } = this.authJwtDomain.createTokens(
            user,
            loginFrom,
            loginWith
        );
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtDomain.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );

        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const events = [
            this.activityLogDomain.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const now = this.helperDateService.create();
        const { isNewDevice, sessionShouldBeInactive } =
            await this.databaseService.withTransaction(async tx => {
                const notificationProvider =
                    this.deviceUtil.resolveNotificationProvider(
                        device.platform ?? null
                    );
                const upserted = await this.deviceDomain.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    notificationProvider,
                    now
                );
                let revoked: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revoked =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                await this.sessionDomain.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userRepository.updateLoginInTx(
                    tx,
                    user.id,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return {
                    isNewDevice: upserted.isNewDevice,
                    sessionShouldBeInactive: revoked,
                };
            });

        const promises = [
            this.sessionCache.setLogin(user.id, sessionId, jti, expiredAt),
        ];

        if (sessionShouldBeInactive && sessionShouldBeInactive.length > 0) {
            const purged = this.sessionDomain.purgeRevokedLogins(
                user.id,
                sessionShouldBeInactive
            );
            promises.push(purged);
        }

        if (isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const newDeviceLoginSent =
                this.notificationQueue.sendNewDeviceLogin(user.id, {
                    requestLog,
                    loginFrom,
                    loginWith,
                    loginAt: loginAtIso,
                });
            promises.push(newDeviceLoginSent);
        }

        await Promise.all(promises);

        this.activityLogDomain.stagePrepared(events);

        return tokens;
    }

    async handleLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        if (!user.isVerified) {
            const emailVerification =
                this.userVerificationDomain.verificationCreateVerification(
                    EnumVerificationType.email
                ) as IUserVerificationEmailCreate;

            await this.userVerificationDomain.persistVerificationEmail(
                user.id,
                user.email,
                emailVerification
            );

            const expiredAt = this.helperDateService.formatToIso(
                emailVerification.expiredAt
            );
            await this.notificationQueue.sendVerificationEmail(user.id, {
                expiredAt,
                reference: emailVerification.reference,
                link: emailVerification.link,
                expiredInMinutes: emailVerification.expiredInMinutes,
            });

            throw new UserEmailNotVerifiedException();
        }

        if (!user.twoFactor?.enabled) {
            const tokens = await this.createTokenAndSession(
                user,
                device,
                loginFrom,
                loginWith,
                loginAt
            );

            return {
                isTwoFactorEnable: false,
                lastWorkspaceId: user.lastWorkspaceId,
                lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
                tokens,
            };
        }

        const { challengeToken, expiresInMs } =
            await this.authCache.createChallenge({
                userId: user.id,
                device,
                loginFrom,
                loginWith,
            });
        if (user.twoFactor?.requiredSetup) {
            const { encryptedSecret, otpauthUrl, secret } =
                await this.authTwoFactorDomain.setupTwoFactor(
                    user.id,
                    user.email
                );
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userTwoFactorRepository.setupTwoFactor(
                user.id,
                encryptedSecret
            );

            this.activityLogDomain.stagePrepared(events);

            return {
                isTwoFactorEnable: true,
                lastWorkspaceId: user.lastWorkspaceId,
                lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining:
                        user.twoFactor?.backupCodes.length ?? 0,
                    otpauthUrl,
                    secret,
                },
            };
        }

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId: user.lastWorkspaceId,
            lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
            twoFactor: {
                isRequiredSetup: false,
                challengeToken,
                challengeExpiresInMs: expiresInMs,
                backupCodesRemaining: user.twoFactor?.backupCodes.length ?? 0,
            },
        };
    }

    async handleTwoFactorValidation(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        await this.assertTwoFactorUnlocked(user);
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        const verified = await this.authTwoFactorDomain.verifyTwoFactor(
            user.twoFactor!,
            {
                method,
                code,
                backupCode,
            }
        );
        if (!verified.isValid) {
            const attempted =
                await this.userTwoFactorRepository.increaseTwoFactorAttempt(
                    user.id
                );
            user.twoFactor = {
                ...attempted,
                backupCodes: user.twoFactor!.backupCodes,
            };

            if (this.authTwoFactorDomain.checkAttempt(user)) {
                await this.authCache.lockTwoFactorAttempt(user);
            }

            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);

        return verified;
    }

    /** Checks a code from a newly set-up authenticator against the pending secret, under the same attempt policy as every other 2FA check. */
    async handleTwoFactorSetupValidation(
        user: IUser,
        encryptedPendingSecret: string,
        code: string
    ): Promise<void> {
        await this.assertTwoFactorUnlocked(user);

        const isValid = this.authTwoFactorDomain.verifySetupCode(
            encryptedPendingSecret,
            user.id,
            code
        );
        if (!isValid) {
            await this.recordTwoFactorFailure(user);

            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);
    }

    /** Persists a successful 2FA check in the caller's transaction; a backup code is consumed only while the stored codes are still the ones it was verified against, otherwise the check is rejected. */
    async recordTwoFactorVerificationInTx(
        tx: IDatabaseTransactionClient,
        user: IUser,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<void> {
        const recorded = await this.userTwoFactorRepository.verifyTwoFactorInTx(
            tx,
            user.id,
            verified
        );
        if (!recorded) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    /** Persists a successful 2FA check; a backup code is consumed only while the stored codes are still the ones it was verified against, otherwise the check is rejected. */
    async recordTwoFactorVerification(
        user: IUser,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<void> {
        const recorded = await this.userTwoFactorRepository.verifyTwoFactor(
            user.id,
            verified
        );
        if (!recorded) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    async refreshSession(
        user: IUser,
        refreshToken: string
    ): Promise<IAuthToken> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const {
            sessionId,
            userId,
            jti: oldJti,
            loginFrom,
            loginWith,
        } = this.authJwtDomain.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshToken
        );

        const session = await this.sessionCache.getLogin(userId, sessionId);
        if (!session || !oldJti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        const sessionJtiHash = this.helperHashService.sha256Hash(session.jti);
        const oldJtiHash = this.helperHashService.sha256Hash(oldJti);
        const isJtiMatch = this.helperHashService.sha256Compare(
            sessionJtiHash,
            oldJtiHash
        );
        if (!isJtiMatch) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        try {
            const {
                jti: newJti,
                tokens,
                expiredInMs,
            } = this.authJwtDomain.refreshToken(user, refreshToken);

            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRefreshToken,
                }),
            ];
            await this.databaseService.withTransaction(async tx => {
                await this.sessionDomain.updateJtiInTx(tx, sessionId, newJti);
                const now = this.helperDateService.create();
                await this.userRepository.updateLoginInTx(
                    tx,
                    userId,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );
            });

            const isRotated = await this.sessionCache.updateLogin(
                userId,
                sessionId,
                session,
                newJti,
                expiredInMs
            );
            if (!isRotated) {
                throw new AuthJwtRefreshTokenInvalidException();
            }

            this.activityLogDomain.stagePrepared(events);

            return tokens;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        await this.sessionDomain.validateActive(userId, sessionId);

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userLogout,
            }),
        ];
        const now = this.helperDateService.create();
        await this.databaseService.withTransaction(async tx => {
            await this.sessionDomain.revokeInTx(
                tx,
                userId,
                sessionId,
                userId,
                now
            );
            await this.deviceDomain.clearNotificationInTx(
                tx,
                userId,
                deviceOwnershipId,
                userId,
                now
            );
        });
        await this.sessionDomain.purgeRevokedLogins(userId, [
            { id: sessionId },
        ]);

        this.activityLogDomain.stagePrepared(events);
    }
}
