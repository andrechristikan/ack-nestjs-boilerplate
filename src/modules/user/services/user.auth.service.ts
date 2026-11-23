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
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserReauthenticationAction,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IRequestUserAgent } from '@common/request/interfaces/request.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { DeviceService } from '@modules/device/services/device.service';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
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
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import { UserReauthenticationOtpNotAllowedException } from '@modules/user/exceptions/user.reauthentication-otp-not-allowed.exception';
import { UserReauthenticationOtpRequiredException } from '@modules/user/exceptions/user.reauthentication-otp-required.exception';
import type {
    IUser,
    IUserCredential,
    IUserLoginMfaChallenge,
    IUserReauthenticationCheck,
    IUserReauthenticationInput,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordService: UserPasswordService,
        private readonly userVerificationService: UserVerificationService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userService: UserService,
        private readonly mfaService: MfaService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly outboxService: OutboxService,
        private readonly notificationService: NotificationService,
        private readonly requestContextService: RequestContextService,
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService
    ) {}

    private toUserAgentDisplay({
        browser,
        device,
        os,
    }: IRequestUserAgent): INotificationUserAgentDisplay {
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
                return EnumActivityLogAction.userLoginApple;
            case EnumUserLoginWith.socialGoogle:
                return EnumActivityLogAction.userLoginGoogle;
            case EnumUserLoginWith.passkey:
                return EnumActivityLogAction.userLoginPasskey;
            case EnumUserLoginWith.credential:
            default:
                return EnumActivityLogAction.userLoginCredential;
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

    private async assertPasskeyReauthentication(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        passkeyChallengeToken: string,
        passkeyResponse: AuthenticationResponseJSON
    ): Promise<IUserReauthenticationCheck> {
        const webAuthnChallenge =
            await this.mfaChallengeService.getWebAuthnChallengeForUser(
                passkeyChallengeToken,
                EnumMfaChallengePurpose.reauthentication,
                user.id
            );

        const mfa = await this.mfaService.check(
            requestContext,
            apiKeyContext,
            user.id,
            {
                method: EnumMfaMethod.passkey,
                code: null,
                backupCode: null,
                passkeyResponse,
            },
            webAuthnChallenge
        );

        return {
            isPasswordChecked: false,
            mfa,
            verificationId: null,
            passkeyChallengeToken,
        };
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

        return this.authPasswordUtil.isPasswordMatched(
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

    /** Throws when the account holds a password or has MFA on, the stronger proofs the email code never replaces. */
    async assertReauthenticationOtpAllowed(user: IUser): Promise<void> {
        const credential = this.userPasswordService.getCredential(user);
        const isMfaEnabled = await this.mfaService.isEnabled(user.id);
        if (credential !== null || isMfaEnabled) {
            throw new UserReauthenticationOtpNotAllowedException();
        }
    }

    /** Asserts one passkey proof as the whole re-authentication when both passkey fields are present; otherwise the current password when the account has one, an MFA proof when MFA is on except for the mfaTotpEnable action after a password check, and the email code of the action for an account with neither, writing nothing on a match. */
    async assertReauthentication(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        {
            action,
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: IUserReauthenticationInput
    ): Promise<IUserReauthenticationCheck> {
        if (passkeyChallengeToken !== null && passkeyResponse !== null) {
            return this.assertPasskeyReauthentication(
                requestContext,
                apiKeyContext,
                user,
                passkeyChallengeToken,
                passkeyResponse
            );
        }

        const credential = this.userPasswordService.getCredential(user);
        const isPasswordChecked = credential !== null;
        // Sequential by design: a failed password counts no MFA failure
        await this.assertCurrentPassword(
            requestContext,
            apiKeyContext,
            user,
            password
        );

        const isMfaEnabled = await this.mfaService.isEnabled(user.id);
        const requiresMfa =
            isMfaEnabled &&
            (action !== EnumUserReauthenticationAction.mfaTotpEnable ||
                !isPasswordChecked);
        let mfaCheck: IMfaCheck | null = null;
        if (requiresMfa) {
            mfaCheck = await this.mfaService.check(
                requestContext,
                apiKeyContext,
                user.id,
                { method, code, backupCode, passkeyResponse: null },
                null
            );
        }

        let verificationId: string | null = null;
        if (!isPasswordChecked && !isMfaEnabled) {
            if (otp === null) {
                throw new UserReauthenticationOtpRequiredException();
            }

            const verification =
                await this.userVerificationService.getOneActiveReauthentication(
                    user.id,
                    action,
                    otp
                );
            verificationId = verification.id;
        }

        return {
            isPasswordChecked,
            mfa: mfaCheck,
            verificationId,
            passkeyChallengeToken: null,
        };
    }

    /** Completes the proofs assertReauthentication checked on the caller's transaction: the passkey challenge claim, the password counter reset, the MFA completion with the verify entry, and the email code marked used, throwing when it was used first. */
    async completeReauthenticationInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        {
            isPasswordChecked,
            mfa,
            verificationId,
            passkeyChallengeToken,
        }: IUserReauthenticationCheck
    ): Promise<void> {
        if (passkeyChallengeToken !== null) {
            await this.mfaChallengeService.consumeInTx(
                tx,
                passkeyChallengeToken,
                EnumMfaChallengePurpose.reauthentication,
                authContext.userId
            );
        }
        if (isPasswordChecked) {
            await this.userPasswordService.resetPasswordAttemptInTx(
                tx,
                authContext.userId
            );
        }
        if (mfa !== null) {
            await this.mfaService.completeInTx(tx, authContext.userId, mfa);
            const entry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfa,
                    userId: authContext.userId,
                    createdBy: authContext.userId,
                }
            );
            await this.outboxService.addInTx(tx, entry);
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
        const isPasswordExpired: boolean =
            this.authPasswordUtil.isPasswordExpired(user.passwordExpired);
        if (isPasswordExpired) {
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

        return this.assertSocialLoginAllowed(user);
    }

    async getOneForSocialLoginById(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(
            userId,
            null
        );

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
                seconds: this.authJwtService.refreshTokenExpiresInSeconds,
            })
        );
        const now = this.helperDateService.create();
        const loginAction = this.resolveLoginActivityLogAction(loginWith);
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

    /** Resolves the active verified user of an MFA login challenge; a user with MFA off throws MfaNotEnabledException. */
    async getOneForMfaLogin(userId: string): Promise<IUser> {
        const [user, isMfaEnabled] = await Promise.all([
            this.userRepository.findOneWithRoleById(userId, null),
            this.mfaService.isEnabled(userId),
        ]);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!isMfaEnabled) {
            throw new MfaNotEnabledException();
        }

        return user;
    }

    /** Resolves the active verified user of a passkey; a missing or inactive user throws the credential error. */
    async getOneForPasskeyLogin(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(
            userId,
            null
        );
        if (!user || user.status !== EnumUserStatus.active) {
            throw new UserCredentialInvalidException();
        }
        this.assertVerified(user);

        return user;
    }

    /** Creates the login challenge on the caller's transaction and answers its token, the methods the user can finish with, and the passkey request options when the user owns a passkey. */
    async createMfaChallengeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginMfaChallenge> {
        const methods = await this.mfaService.getLoginMethods(userId);
        let passkeyOptions: PublicKeyCredentialRequestOptionsJSON | null = null;
        if (methods.includes(EnumMfaMethod.passkey)) {
            passkeyOptions =
                await this.mfaPasskeyService.getAssertionOptions(userId);
        }
        const token = await this.mfaChallengeService.createInTx(tx, {
            purpose: EnumMfaChallengePurpose.login,
            userId,
            device,
            loginFrom,
            loginWith,
            webAuthnChallenge: passkeyOptions?.challenge ?? null,
        });

        return { ...token, methods, passkeyOptions };
    }
}
