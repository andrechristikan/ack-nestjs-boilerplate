import { OutboxService } from '@common/outbox/services/outbox.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationUserAgentDisplay } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IDeviceLoginUpsert } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import { UserReauthenticationOtpNotAllowedException } from '@modules/user/exceptions/user.reauthentication-otp-not-allowed.exception';
import { UserReauthenticationOtpRequiredException } from '@modules/user/exceptions/user.reauthentication-otp-required.exception';
import type {
    IUser,
    IUserCredential,
    IUserPasswordAttemptLimit,
    IUserReauthenticationInput,
    IUserReauthenticationPasswordResult,
} from '@modules/user/interfaces/user.interface';
import type { IUserAuthSession } from '@modules/user/interfaces/user.auth.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordService: UserPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly userUtil: UserUtil,
        private readonly helperHashService: HelperHashService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly outboxService: OutboxService,
        private readonly notificationQueue: NotificationQueue,
        private readonly requestContextService: RequestContextService,
        private readonly activityLogQueue: ActivityLogQueue,
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

    private resolveLoginActivityLogAction(
        loginWith: EnumUserLoginWith
    ): EnumActivityLogAction {
        switch (loginWith) {
            case EnumUserLoginWith.socialApple:
                return EnumActivityLogAction.userLoggedInWithApple;
            case EnumUserLoginWith.socialGoogle:
                return EnumActivityLogAction.userLoggedInWithGoogle;
            case EnumUserLoginWith.passkey:
                return EnumActivityLogAction.userLoggedInWithPasskey;
            case EnumUserLoginWith.credential:
            default:
                return EnumActivityLogAction.userLoggedInWithCredential;
        }
    }

    private assertSocialLoginAllowed(user: IUser | null): IUser {
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        return user;
    }

    private async checkPassword(
        credential: IUserCredential,
        plainPassword: string | null
    ): Promise<IUserPasswordAttemptLimit | null> {
        const { user } = credential;
        this.userPasswordService.assertPasswordAttemptAvailable(user);

        const isMatch = await this.isCredentialMatch(credential, plainPassword);
        if (!isMatch) {
            return this.userPasswordService.getPasswordAttemptLimit();
        }
        this.assertPasswordNotExpired(user);

        return null;
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

        return this.helperHashService.argon2Compare(
            plainPassword,
            hashedPassword
        );
    }

    /** Throws when the account holds a password or has MFA on, the stronger proofs the email code never replaces. */
    assertReauthenticationOtpAllowed(user: IUser, isMfaEnabled: boolean): void {
        const credential = this.userPasswordService.getCredential(user);
        if (credential !== null || isMfaEnabled) {
            throw new UserReauthenticationOtpNotAllowedException();
        }
    }

    /** Checks the current password of a re-authentication and writes nothing; unchecked with no limit when both passkey fields are present or the account holds no password, the attempt limit on a mismatch, and a lock or an expired password throws. */
    async checkReauthenticationPassword(
        user: IUser,
        {
            password,
            passkeyChallengeToken,
            passkeyResponse,
        }: IUserReauthenticationInput
    ): Promise<IUserReauthenticationPasswordResult> {
        if (passkeyChallengeToken !== null && passkeyResponse !== null) {
            return { isPasswordChecked: false, limit: null };
        }

        const credential = this.userPasswordService.getCredential(user);
        if (credential === null) {
            return { isPasswordChecked: false, limit: null };
        }

        const limit = await this.checkPassword(credential, password);

        return { isPasswordChecked: true, limit };
    }

    /** Counts a failed password re-authentication on the caller's transaction and adds the userReauthenticationFailed entry; true when the count locked. */
    async countFailedReauthenticationInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        limit: IUserPasswordAttemptLimit
    ): Promise<boolean> {
        const isLocked =
            await this.userPasswordService.countFailedPasswordAttemptInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext.userId,
                limit
            );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userReauthenticationFailed,
                userId: authContext.userId,
                createdBy: authContext.userId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return isLocked;
    }

    /** Throws UserPasswordAttemptMaxException when the counted failure locked, else UserPasswordNotMatchException. */
    throwFailedReauthentication(isLocked: boolean): never {
        if (isLocked) {
            throw new UserPasswordAttemptMaxException();
        }

        throw new UserPasswordNotMatchException();
    }

    /** Answers the id of the active email code of the action for an account with neither a checked password nor MFA, throwing when no code is given or it is invalid; null for any other account, reading nothing. */
    async getReauthenticationVerificationId(
        user: IUser,
        { action, otp }: IUserReauthenticationInput,
        isPasswordChecked: boolean,
        isMfaEnabled: boolean
    ): Promise<string | null> {
        if (isPasswordChecked || isMfaEnabled) {
            return null;
        }

        if (otp === null) {
            throw new UserReauthenticationOtpRequiredException();
        }

        const verification =
            await this.userVerificationService.getOneActiveReauthentication(
                user.id,
                action,
                otp
            );

        return verification.id;
    }

    /** Completes the proofs checked by the user part on the caller's transaction: the password counter reset and the email code marked used, throwing when it was used first. */
    async completeReauthenticationInTx(
        tx: IDatabaseTransactionClient,
        authContext: IAuthJwtAccessContext,
        isPasswordChecked: boolean,
        verificationId: string | null
    ): Promise<void> {
        if (isPasswordChecked) {
            await this.userPasswordService.resetPasswordAttemptInTx(
                tx,
                authContext.userId
            );
        }
        if (verificationId !== null) {
            const isMarkedUsed =
                await this.userVerificationService.markUsedInTx(
                    tx,
                    verificationId,
                    authContext.userId
                );
            if (!isMarkedUsed) {
                throw new UserReauthenticationOtpInvalidException();
            }
        }
    }

    assertPasswordNotExpired(user: IUser): void {
        const isPasswordExpired: boolean = this.userUtil.isPasswordExpired(
            user.passwordExpired
        );
        if (isPasswordExpired) {
            throw new UserPasswordExpiredException();
        }
    }

    assertCredentialMatched(isMatch: boolean): void {
        if (!isMatch) {
            throw new UserCredentialInvalidException();
        }
    }

    /** Trims and lowercases the email; null when no undeleted user holds it. */
    async getOneByEmail(email: string): Promise<IUser | null> {
        const normalizedEmail = this.userUtil.normalizeEmail(email);

        return this.userRepository.findOneWithRoleByEmail(normalizedEmail);
    }

    async getOneForSocialLogin(email: string): Promise<IUser> {
        const normalizedEmail = this.userUtil.normalizeEmail(email);
        const user =
            await this.userRepository.findOneWithRoleByEmail(normalizedEmail);

        return this.assertSocialLoginAllowed(user);
    }

    async getOneForSocialLoginById(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);

        return this.assertSocialLoginAllowed(user);
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
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userEmailVerified,
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

    /** Revokes the user's earlier sessions on the upserted device ownership unless the device is new, revokes every other user's live sessions on the device with their entries, creates the session, stamps the login, and adds the login entry on the caller's transaction; adds the newDeviceLogin effect when the device is new, and returns the tokens signed after the writes. */
    async createTokenAndSessionInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        device: IDeviceLoginUpsert,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserAuthSession> {
        const { requestLog } = requestContext;
        const { sessionId, jti } = this.authJwtService.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds: this.authJwtService.refreshTokenExpiresInSeconds,
            })
        );
        const now = this.helperDateService.create();
        const loginAction = this.resolveLoginActivityLogAction(loginWith);
        if (!device.isNewDevice) {
            await this.sessionService.revokeByDeviceOwnershipInTx(
                tx,
                user.id,
                device.deviceOwnership.id,
                user.id,
                now
            );
        }
        if (device.otherOwnershipIds.length > 0) {
            await this.sessionService.revokeByDeviceOwnershipIdsInTx(
                tx,
                requestContext,
                apiKeyContext,
                device.otherOwnershipIds,
                user.id,
                now
            );
        }
        await this.sessionService.createInTx(
            tx,
            user.id,
            sessionId,
            device.deviceOwnership.id,
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
            this.activityLogQueue.recordEffect(
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
        if (device.isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const deviceName = this.requestContextService.resolveDevice(
                requestLog.userAgent
            );
            const city = this.requestContextService.resolveCity(
                requestLog.geoLocation
            );
            const display = this.toUserAgentDisplay(requestLog.userAgent);
            const newDevice = this.notificationQueue.notify(
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

        const deviceOwnershipId = device.deviceOwnership.id;
        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );

        return { tokens, sessionId };
    }

    /** Resolves the active verified user of an MFA login challenge; reads no MFA state. */
    async getOneForMfaLogin(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        }

        return user;
    }

    /** Resolves the active verified user of a passkey; a missing or inactive user throws the credential error. */
    async getOneForPasskeyLogin(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user || user.status !== EnumUserStatus.active) {
            throw new UserCredentialInvalidException();
        }
        this.assertVerified(user);

        return user;
    }
}
