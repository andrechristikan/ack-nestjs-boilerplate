import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumVerificationType,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionCache } from '@modules/session/caches/session.cache';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import {
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
        private readonly requestStoreService: RequestStoreService
    ) {}

    async assertWorkspaceInvitationAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
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

        const now = this.helperDateService.create();
        const { isNewDevice, sessionShouldBeInactive } =
            await this.databaseService.client.$transaction(async tx => {
                const upserted = await this.deviceDomain.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    this.deviceUtil.resolveNotificationProvider(
                        device.platform ?? null
                    ),
                    now
                );
                let revoked: { id: string }[] = [];
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
                    requestLog.ipAddress ?? null,
                    now
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    this.userUtil.resolveLoginActivityLogAction(loginWith),
                    requestLog,
                    null
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
            promises.push(
                this.sessionCache.deleteAllLogins(
                    user.id,
                    sessionShouldBeInactive
                )
            );
        }

        if (isNewDevice) {
            promises.push(
                this.notificationQueue.sendNewDeviceLogin(user.id, {
                    requestLog,
                    loginFrom,
                    loginWith,
                    loginAt: this.helperDateService.formatToIso(loginAt),
                })
            );
        }

        await Promise.all(promises);

        return tokens;
    }

    async handleLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (!user.isVerified) {
            const emailVerification =
                this.userVerificationDomain.verificationCreateVerification(
                    user.id,
                    EnumVerificationType.email
                ) as IUserVerificationEmailCreate;

            await this.userVerificationDomain.persistVerificationEmail(
                user.id,
                user.email,
                emailVerification
            );

            await this.notificationQueue.sendVerificationEmail(user.id, {
                expiredAt: this.helperDateService.formatToIso(
                    emailVerification.expiredAt
                ),
                reference: emailVerification.reference,
                link: emailVerification.encryptedLink,
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
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorDomain.setupTwoFactor(user.email);
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.setupTwoFactorInTx(
                    tx,
                    user.id,
                    encryptedSecret,
                    iv
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userSetupTwoFactor,
                    requestLog,
                    null
                );
            });

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
        const retryAfterMs = await this.authCache.getLockTwoFactorAttempt(user);
        if (retryAfterMs > 0) {
            throw new AuthTwoFactorAttemptTemporaryLockException(
                retryAfterMs / 1000
            );
        } else if (!method) {
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

    async revokeAllSessions(userId: string): Promise<void> {
        await this.sessionDomain.deleteAllLogins(userId);

        return;
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        await this.sessionDomain.deleteOneLogin(userId, sessionId);

        return;
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
        if (!session || session.jti !== oldJti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        try {
            const {
                jti: newJti,
                tokens,
                expiredInMs,
            } = this.authJwtDomain.refreshToken(user, refreshToken);

            await Promise.all([
                this.sessionCache.updateLogin(
                    userId,
                    sessionId,
                    session,
                    newJti,
                    expiredInMs
                ),
                this.databaseService.client.$transaction(async tx => {
                    await this.sessionDomain.updateJtiInTx(
                        tx,
                        sessionId,
                        newJti
                    );
                    await this.userRepository.updateLoginInTx(
                        tx,
                        userId,
                        loginFrom,
                        loginWith,
                        requestLog.ipAddress ?? null,
                        this.helperDateService.create()
                    );
                    await this.activityLogDomain.recordInTx(
                        tx,
                        userId,
                        EnumActivityLogAction.userRefreshToken,
                        requestLog,
                        null
                    );
                }),
            ]);

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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
        const now = this.helperDateService.create();

        await this.revokeSession(userId, sessionId);
        await this.databaseService.client.$transaction(async tx => {
            await this.sessionDomain.revokeInTx(
                tx,
                userId,
                sessionId,
                userId,
                now
            );
            await this.deviceDomain.clearNotificationInTx(
                tx,
                deviceOwnershipId,
                userId,
                now
            );
            await this.activityLogDomain.recordInTx(
                tx,
                userId,
                EnumActivityLogAction.userLogout,
                requestLog,
                null
            );
        });
    }
}
