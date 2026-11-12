import { OutboxService } from '@modules/outbox/services/outbox.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
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
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
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
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type {
    IUser,
    IUserCredentialAttempt,
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
        private readonly authTwoFactorService: AuthTwoFactorService,
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

    /** Resolves the active credential user of an email and counts one password attempt, adding the lockout row and entries when the budget is spent; isAttemptCounted false on a spent budget, and an unknown, inactive, or passwordless account throws the credential error. */
    async countCredentialAttempt(
        email: string,
        context: IRequestContext
    ): Promise<IUserCredentialAttempt> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user || user.status !== EnumUserStatus.active) {
            throw new UserCredentialInvalidException();
        }

        const attempt = await this.userPasswordService.countPasswordAttempt(
            user,
            context
        );
        if (!attempt) {
            throw new UserCredentialInvalidException();
        }

        return attempt;
    }

    /** Checks the password of a counted attempt and resets the counter on a match; false on a mismatch or a null password, so the caller records the failure before asserting it. */
    async verifyCredential(
        { user, hashedPassword }: IUserCredentialAttempt,
        plainPassword: string | null
    ): Promise<boolean> {
        if (plainPassword === null) {
            return false;
        }

        const isPasswordValid = await this.authPasswordUtil.validatePassword(
            plainPassword,
            hashedPassword
        );
        if (!isPasswordValid) {
            return false;
        }

        await this.userPasswordService.resetPasswordAttempt(user.id);

        return true;
    }

    /** Asserts the password of a counted attempt: a spent budget throws the max-attempt error, a match resets the counter, a mismatch or a null password throws not-match, and an expired password throws after a match. */
    async assertPasswordAttempt(
        attempt: IUserCredentialAttempt,
        plainPassword: string | null
    ): Promise<void> {
        this.userPasswordService.assertAttemptCounted(attempt.isAttemptCounted);

        const isMatch = await this.verifyCredential(attempt, plainPassword);
        this.assertPasswordMatched(isMatch);
        this.assertPasswordNotExpired(attempt.user);
    }

    /** Counts one password attempt of an account holding a password, then asserts the password; returns at once for an account with no password. */
    async assertCurrentPassword(
        user: IUser,
        plainPassword: string | null,
        context: IRequestContext
    ): Promise<void> {
        const attempt = await this.userPasswordService.countPasswordAttempt(
            user,
            context
        );
        if (attempt === null) {
            return;
        }

        await this.assertPasswordAttempt(attempt, plainPassword);
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

    /** Marks the user verified by the provider-verified email, clearing its password, and adds the verified entry in the same transaction. */
    async verifyEmailBySocial(
        user: IUser,
        context: IRequestContext
    ): Promise<IUser> {
        const row = await this.outboxService.withTransaction(async tx => {
            const marked =
                await this.userVerificationService.markVerifiedBySocialInTx(
                    tx,
                    user.id
                );
            const entry = this.activityLogService.recordEffect(
                {
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: user.id,
                    createdBy: user.id,
                },
                context
            );
            await this.outboxService.addInTx(tx, entry);

            return marked;
        });

        return { ...user, ...row };
    }

    assertVerified(user: IUser): void {
        if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        }
    }

    /** Upserts the device, revokes the user's earlier sessions on it and every other user's live sessions on the device, creates the session, stamps the login, and adds the login and revoke entries in one transaction; adds the newDeviceLogin effect when the device is new, and returns the tokens. */
    async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date,
        context: IRequestContext
    ): Promise<IUserLoginSession> {
        const { requestLog } = context;
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
        const deviceOwnershipId = await this.outboxService.withTransaction(
            async tx => {
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
                        {
                            action: loginAction,
                            userId: user.id,
                            createdBy: user.id,
                        },
                        context
                    ),
                ];
                for (const { userId, sessions } of affectedSessions) {
                    const metadata =
                        this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                            user.id,
                            sessions.length
                        );
                    const revokeEntry = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                            userId,
                            createdBy: user.id,
                            metadata,
                        },
                        context
                    );
                    effects.push(revokeEntry);
                }
                if (upserted.isNewDevice) {
                    const loginAtIso =
                        this.helperDateService.formatToIso(loginAt);
                    const deviceName = this.requestContextService.resolveDevice(
                        requestLog.userAgent
                    );
                    const city = this.requestContextService.resolveCity(
                        requestLog.geoLocation
                    );
                    const display = this.toUserAgentDisplay(
                        requestLog.userAgent
                    );
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

                return upserted.deviceOwnership.id;
            }
        );

        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );

        return { tokens, sessionId, jti };
    }

    /** Creates the login challenge; when setup is required, also generates and saves a pending authenticator secret with its setup entry. */
    async createTwoFactorChallenge(
        user: IUserTwoFactorEnabled,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        context: IRequestContext
    ): Promise<IUserLoginTwoFactorChallenge> {
        const challengePromise = this.authTwoFactorService.createChallenge({
            userId: user.id,
            device,
            loginFrom,
            loginWith,
        });
        const requiresSetup = this.requiresTwoFactorSetup(user);
        if (requiresSetup) {
            const [
                { challengeToken, expiresInMs },
                { encryptedSecret, otpauthUrl, secret },
            ] = await Promise.all([
                challengePromise,
                this.userTwoFactorService.setup(user),
            ]);
            await this.userTwoFactorService.saveSetup(
                user.id,
                encryptedSecret,
                context
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
