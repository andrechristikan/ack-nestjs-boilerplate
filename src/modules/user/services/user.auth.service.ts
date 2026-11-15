import { OutboxService } from '@common/outbox/services/outbox.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationUserAgentDisplay } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type {
    IUser,
    IUserCredential,
    IUserLoginTwoFactorChallenge,
    IUserTwoFactorEnabled,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordService: UserPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userService: UserService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly outboxService: OutboxService,
        private readonly notificationService: NotificationService,
        private readonly requestContextService: RequestContextService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private toUserAgentDisplay({
        browser,
        device,
        os,
    }: UserAgent): INotificationUserAgentDisplay {
        return {
            browser: `${browser?.name ?? ''} ${browser?.version ?? ''}`,
            deviceDetail: `${device?.vendor ?? ''} ${device?.model ?? ''} (${device?.type ?? ''})`,
            os: `${os?.name ?? ''} ${os?.version ?? ''}`,
        };
    }

    private requiresTwoFactorSetup(user: IUserTwoFactorEnabled): boolean {
        return user.twoFactor.requiredSetup;
    }

    /** Resolves the active credential user of an email, counting nothing; an unknown, inactive, or passwordless account throws the credential error. */
    async getOneForCredentialLogin(email: string): Promise<IUserCredential> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user || user.status !== EnumUserStatus.active) {
            throw new UserCredentialInvalidException();
        }

        const credential = this.userPasswordService.getCredential(user);
        if (!credential) {
            throw new UserCredentialInvalidException();
        }

        return credential;
    }

    /** Compares the password with the credential and writes nothing; false on a mismatch or a null password. */
    async isCredentialMatch(
        { hashedPassword }: IUserCredential,
        plainPassword: string | null
    ): Promise<boolean> {
        if (plainPassword === null) {
            return false;
        }

        return this.authPasswordUtil.validatePassword(
            plainPassword,
            hashedPassword
        );
    }

    /** Asserts the password of a credential: a lock throws the max-attempt error before the compare, a mismatch or a null password counts the failure and throws the max-attempt error when it locked, else not-match, and an expired password throws after a match. */
    async assertPasswordAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        credential: IUserCredential,
        plainPassword: string | null
    ): Promise<void> {
        const { user } = credential;
        this.userPasswordService.assertPasswordAttemptAvailable(user);

        const isMatch = await this.isCredentialMatch(credential, plainPassword);
        if (!isMatch) {
            const isLocked =
                await this.userPasswordService.countFailedPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    user
                );
            if (isLocked) {
                throw new UserPasswordAttemptMaxException();
            }
        }
        this.assertPasswordMatched(isMatch);
        this.assertPasswordNotExpired(user);
    }

    /** Asserts the password of an account holding one, counting a failure; returns at once for an account with no password. */
    async assertCurrentPassword(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        plainPassword: string | null
    ): Promise<void> {
        const credential = this.userPasswordService.getCredential(user);
        if (credential === null) {
            return;
        }

        await this.assertPasswordAttempt(
            requestContext,
            apiKeyContext,
            credential,
            plainPassword
        );
    }

    assertPasswordNotExpired(user: IUser): void {
        const checkPasswordExpired: boolean =
            this.authPasswordUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new UserPasswordExpiredException();
        }
    }

    assertPasswordMatched(isMatch: boolean): void {
        if (!isMatch) {
            throw new UserPasswordNotMatchException();
        }
    }

    assertCredentialMatched(isMatch: boolean): void {
        if (!isMatch) {
            throw new UserCredentialInvalidException();
        }
    }

    /** Trims and lowercases the email; null when no undeleted user holds it. */
    async getOneByEmail(email: string): Promise<IUser | null> {
        return this.userRepository.findOneWithRoleByEmail(
            email.trim().toLowerCase()
        );
    }

    async getOneForSocialLogin(email: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleByEmail(
            email.trim().toLowerCase()
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        return user;
    }

    /** Marks the user verified by the provider-verified email, clearing its password, and adds the verified entry on the caller's transaction. */
    async verifyEmailBySocialInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser
    ): Promise<IUser> {
        const row = await this.userVerificationService.markVerifiedBySocialInTx(
            tx,
            user.id
        );
        const entry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: user.id,
                createdBy: user.id,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return { ...user, ...row };
    }

    assertVerified(user: IUser): void {
        if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        }
    }

    /** Upserts the device, revokes the user's earlier sessions on it and every other user's live sessions on the device, creates the session, stamps the login, and adds the login and revoke entries on the caller's transaction; adds the newDeviceLogin effect when the device is new, and returns the tokens signed after the writes. */
    async createTokenAndSessionInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginSession> {
        const { requestLog } = requestContext;
        const { sessionId, jti } = this.authUtil.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtService.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const upserted = await this.deviceService.upsertForLoginInTx(
            tx,
            user.id,
            device,
            now
        );
        if (!upserted.isNewDevice) {
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

        const effects: IOutboxEffect[] = [
            this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: loginAction,
                    userId: user.id,
                    createdBy: user.id,
                }
            ),
        ];
        for (const { userId, sessions } of affectedSessions) {
            const metadata =
                this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                    user.id,
                    sessions.length
                );
            const revokeEntry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId,
                    createdBy: user.id,
                    metadata,
                }
            );
            effects.push(revokeEntry);
        }
        if (upserted.isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const deviceName = this.requestContextService.resolveDevice(
                requestLog.userAgent
            );
            const city = this.requestContextService.resolveCity(
                requestLog.geoLocation
            );
            const display = this.toUserAgentDisplay(requestLog.userAgent);
            const newDevice = this.notificationService.notify(
                EnumNotificationKind.newDeviceLogin,
                {
                    userId: user.id,
                    proceedBy: user.id,
                    loginFrom,
                    loginWith,
                    loginAt: loginAtIso,
                    device: deviceName,
                    city,
                    ...display,
                    ipAddress: requestLog.ipAddress ?? '',
                }
            );
            effects.push(newDevice);
        }
        await this.outboxService.addManyInTx(tx, effects);

        const deviceOwnershipId = upserted.deviceOwnership.id;
        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );

        return { tokens, sessionId };
    }

    /** Creates the login challenge on the caller's transaction; when setup is required, also generates and saves a pending authenticator secret with its setup entry. */
    async createTwoFactorChallengeInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUserTwoFactorEnabled,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginTwoFactorChallenge> {
        const challengePromise = this.userTwoFactorService.createChallengeInTx(
            tx,
            user.id,
            device,
            loginFrom,
            loginWith
        );
        const requiresSetup = this.requiresTwoFactorSetup(user);
        if (requiresSetup) {
            const [
                { challengeToken, expiresInMs },
                { encryptedSecret, otpauthUrl, secret },
            ] = await Promise.all([
                challengePromise,
                this.userTwoFactorService.setup(user),
            ]);
            await this.userTwoFactorService.saveSetupInTx(
                tx,
                requestContext,
                apiKeyContext,
                user.id,
                encryptedSecret
            );

            return {
                isRequiredSetup: true,
                challengeToken,
                challengeExpiresInMs: expiresInMs,
                backupCodesRemaining: user.twoFactor.backupCodes.length,
                otpauthUrl,
                secret,
            };
        }

        const { challengeToken, expiresInMs } = await challengePromise;

        return {
            isRequiredSetup: false,
            challengeToken,
            challengeExpiresInMs: expiresInMs,
            backupCodesRemaining: user.twoFactor.backupCodes.length,
        };
    }
}
