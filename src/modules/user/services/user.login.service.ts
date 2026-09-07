import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumVerificationType,
} from '@generated/prisma-client';
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
import { AuthCacheService } from '@modules/auth/services/auth.cache.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionService } from '@modules/session/services/session.service';
import { SessionCacheService } from '@modules/session/services/session.cache.service';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import {
    IUser,
    IUserLoginOutcome,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { IUserLoginService } from '@modules/user/interfaces/user.login.service.interface';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

/** Owns the login lifecycle: the token and session pair, the two-factor challenge and the session revocation. */
@Injectable()
export class UserLoginService implements IUserLoginService {
    constructor(
        private readonly userSessionRepository: UserSessionRepository,
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userUtil: UserUtil,
        private readonly userVerificationService: UserVerificationService,
        private readonly deviceUtil: DeviceUtil,
        private readonly authJwtService: AuthJwtService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly authCacheService: AuthCacheService,
        private readonly sessionCacheService: SessionCacheService,
        private readonly sessionService: SessionService,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagService: FeatureFlagService,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async assertWorkspaceInvitationAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
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

        const { tokens, sessionId, jti } = this.authJwtService.createTokens(
            user,
            loginFrom,
            loginWith
        );
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                milliseconds:
                    this.authJwtService.jwtRefreshTokenExpirationTimeInMs,
            })
        );

        const { isNewDevice, sessionShouldBeInactive } =
            await this.userSessionRepository.login(
                user.id,
                device,
                {
                    loginFrom,
                    loginWith,
                    jti,
                    sessionId,
                    expiredAt,
                },
                this.userUtil.resolveLoginActivityLogAction(loginWith),
                this.deviceUtil.resolveNotificationProvider(
                    device.platform ?? null
                ),
                requestLog
            );

        const promises = [
            this.sessionCacheService.setLogin(
                user.id,
                sessionId,
                jti,
                expiredAt
            ),
        ];

        if (sessionShouldBeInactive && sessionShouldBeInactive.length > 0) {
            promises.push(
                this.sessionCacheService.deleteAllLogins(
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
                this.userVerificationService.verificationCreateVerification(
                    user.id,
                    EnumVerificationType.email
                ) as IUserVerificationEmailCreate;

            await this.userVerificationRepository.requestVerificationEmail(
                user.id,
                user.email,
                emailVerification,
                requestLog
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
            await this.authCacheService.createChallenge({
                userId: user.id,
                device,
                loginFrom,
                loginWith,
            });
        if (user.twoFactor?.requiredSetup) {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorService.setupTwoFactor(user.email);
            await this.userTwoFactorRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

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
        const retryAfterMs =
            await this.authCacheService.getLockTwoFactorAttempt(user);
        if (retryAfterMs > 0) {
            throw new AuthTwoFactorAttemptTemporaryLockException(
                retryAfterMs / 1000
            );
        } else if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        const verified = await this.authTwoFactorService.verifyTwoFactor(
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

            if (this.authTwoFactorService.checkAttempt(attempted)) {
                await this.authCacheService.lockTwoFactorAttempt(attempted);
            }

            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);

        return verified;
    }

    async revokeAllSessions(userId: string): Promise<void> {
        await this.sessionService.deleteAllLogins(userId);

        return;
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        await this.sessionService.deleteOneLogin(userId, sessionId);

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
        } = this.authJwtService.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshToken
        );

        const session = await this.sessionCacheService.getLogin(
            userId,
            sessionId
        );
        if (!session || session.jti !== oldJti) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        try {
            const {
                jti: newJti,
                tokens,
                expiredInMs,
            } = this.authJwtService.refreshToken(user, refreshToken);

            await Promise.all([
                this.sessionCacheService.updateLogin(
                    userId,
                    sessionId,
                    session,
                    newJti,
                    expiredInMs
                ),
                this.userSessionRepository.refresh(
                    userId,
                    {
                        sessionId,
                        jti: newJti,
                        expiredAt: session.expiredAt,
                        loginFrom: loginFrom,
                        loginWith: loginWith,
                    },
                    requestLog
                ),
            ]);

            return tokens;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
