import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import { MessageService } from '@common/message/services/message.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserTwoFactorChallengeEncryptionPurpose } from '@modules/user/constants/user.constant';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserTwoFactorChallenge,
    IUserTwoFactorChallengeToken,
    IUserTwoFactorCheck,
    IUserTwoFactorLoginSetup,
    IUserTwoFactorSetupSecret,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserTwoFactorService {
    private readonly maxAttempt: number;
    private readonly lockDurationInMs: number;
    private readonly challengeTtlInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly notificationService: NotificationService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
        this.lockDurationInMs = this.configService.get<number>(
            'auth.twoFactor.lockDurationInMs'
        )!;
        this.challengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    private sealNotificationToken(
        notificationToken: string | null,
        userId: string
    ): string | null {
        if (notificationToken === null) {
            return null;
        }

        return this.helperEncryptionService.aes256Encrypt(
            notificationToken,
            this.encryptionSecretKey,
            UserTwoFactorChallengeEncryptionPurpose,
            userId
        );
    }

    private openNotificationToken(
        encryptedNotificationToken: string | null,
        userId: string
    ): string | null {
        if (encryptedNotificationToken === null) {
            return null;
        }

        return this.helperEncryptionService.aes256Decrypt(
            encryptedNotificationToken,
            this.encryptionSecretKey,
            UserTwoFactorChallengeEncryptionPurpose,
            userId
        );
    }

    private getEnabledTwoFactor({ twoFactor }: IUser): TwoFactor {
        if (!twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        return twoFactor;
    }

    private readSecret(encryptedSecret: string | null, userId: string): string {
        if (!encryptedSecret) {
            throw new AuthTwoFactorSecretUnavailableException();
        }

        try {
            return this.authTwoFactorUtil.decryptSecret(
                encryptedSecret,
                userId
            );
        } catch (err: unknown) {
            const exception = this.authTwoFactorUtil.toDecryptException(err);
            if (exception !== null) {
                this.sentryService.captureException(err);
            }

            throw exception ?? new AppUnknownException(err);
        }
    }

    private async checkCode(
        twoFactor: TwoFactor,
        method: EnumAuthTwoFactorMethod,
        { code, backupCode }: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorCheck | null> {
        const normalizedCode =
            method === EnumAuthTwoFactorMethod.code
                ? code?.trim()
                : backupCode?.trim();
        if (!normalizedCode) {
            return null;
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.readSecret(twoFactor.secret, twoFactor.userId);

            const totpStep = this.authTwoFactorUtil.verifyCode(
                secret,
                normalizedCode
            );

            return totpStep === null
                ? null
                : { verified: { method, newBackupCodes: null }, totpStep };
        }

        if (twoFactor.backupCodes.length === 0) {
            return null;
        }

        const backupValidation = await this.authTwoFactorUtil.verifyBackupCode(
            twoFactor.backupCodes,
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return null;
        }

        const newBackupCodes = [...twoFactor.backupCodes];
        newBackupCodes.splice(backupValidation.index, 1);

        return {
            verified: { method, newBackupCodes },
            totpStep: null,
        };
    }

    private async getOneEnabledForLogin(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        return user;
    }

    /** Stores the challenge row on the given tx under the SHA-256 hash of a new token and answers the raw token; the push token is stored encrypted. */
    async createChallengeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, platform, notificationToken }: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserTwoFactorChallengeToken> {
        const challengeToken = this.helperStringService.random(48);
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const encryptedNotificationToken = this.sealNotificationToken(
            notificationToken,
            userId
        );
        const now = this.helperDateService.create();
        const expiredAt = this.helperDateService.forward(
            now,
            Duration.fromObject({ milliseconds: this.challengeTtlInMs })
        );
        await this.userTwoFactorRepository.createChallengeInTx(tx, {
            userId,
            tokenHash,
            device: {
                fingerprint,
                name,
                platform,
                encryptedNotificationToken,
            },
            loginFrom,
            loginWith,
            expiredAt,
        });

        return { challengeToken, expiresInMs: this.challengeTtlInMs };
    }

    /** Reads the live challenge of a token without claiming it; no live row throws AuthTwoFactorChallengeInvalidException. */
    async getChallenge(
        challengeToken: string
    ): Promise<IUserTwoFactorChallenge> {
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const now = this.helperDateService.create();
        const row =
            await this.userTwoFactorRepository.findActiveChallengeByTokenHash(
                tokenHash,
                now
            );
        if (!row) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const { fingerprint, name, platform, encryptedNotificationToken } =
            row.device;
        const notificationToken = this.openNotificationToken(
            encryptedNotificationToken,
            row.userId
        );

        return {
            userId: row.userId,
            device: { fingerprint, name, platform, notificationToken },
            loginFrom: row.loginFrom,
            loginWith: row.loginWith,
        };
    }

    /** Claims the live challenge of a token on the given tx; a lost claim throws AuthTwoFactorChallengeInvalidException. */
    async consumeChallengeInTx(
        tx: IDatabaseTransactionClient,
        challengeToken: string,
        userId: string
    ): Promise<void> {
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const now = this.helperDateService.create();
        const isClaimed =
            await this.userTwoFactorRepository.consumeChallengeInTx(
                tx,
                tokenHash,
                now,
                userId
            );
        if (!isClaimed) {
            throw new AuthTwoFactorChallengeInvalidException();
        }
    }

    async getOneForLoginVerify(userId: string): Promise<IUser> {
        const user = await this.getOneEnabledForLogin(userId);
        if (user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorRequiredSetupException();
        }

        return user;
    }

    async getOneForLoginSetup(
        userId: string
    ): Promise<IUserTwoFactorLoginSetup> {
        const user = await this.getOneEnabledForLogin(userId);
        if (!user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorNotRequiredSetupException();
        }

        const pendingSecret = user.twoFactor.pendingSecret;
        if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        return { user, pendingSecret };
    }

    /** Throws AuthTwoFactorAttemptMaxException while the lock of the user's two-factor ends later than now. */
    assertAttemptAvailable({ twoFactor }: IUser): void {
        const now = this.helperDateService.create();
        const lockedUntil = twoFactor?.lockedUntil ?? null;
        if (lockedUntil !== null && lockedUntil > now) {
            throw new AuthTwoFactorAttemptMaxException();
        }
    }

    /** Counts one failed two-factor attempt in its own transaction; true when it reached the budget, which locks two-factor for the lock duration and adds the reach-max entry and the loginLocked effect in that transaction; a write conflict throws AuthTwoFactorAttemptMaxException. */
    async countFailedAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { id: userId }: IUser
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const lockedUntil = this.helperDateService.forward(
            now,
            Duration.fromObject({ milliseconds: this.lockDurationInMs })
        );
        const lockedUntilIso = this.helperDateService.formatToIso(lockedUntil);

        try {
            return await this.outboxService.withTransaction(async tx => {
                const isLocked =
                    await this.userTwoFactorRepository.incrementAttemptInTx(
                        tx,
                        userId,
                        this.maxAttempt,
                        lockedUntil
                    );
                if (isLocked) {
                    const entry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                            userId,
                            createdBy: userId,
                        }
                    );
                    const methodLabel = this.messageService.setMessage(
                        'notification.loginLockedMethod.twoFactor'
                    );
                    const effect = this.notificationService.notify(
                        EnumNotificationKind.loginLocked,
                        {
                            userId,
                            proceedBy: userId,
                            method: EnumNotificationLoginLockedMethod.twoFactor,
                            methodLabel,
                            lockedUntil: lockedUntilIso,
                        }
                    );
                    await this.outboxService.addManyInTx(tx, [entry, effect]);
                }

                return isLocked;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorAttemptMaxException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Returns null when the user needs no two-factor check; otherwise requires a method and checks the code, counting a mismatch. */
    async checkIfRequired(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorCheck | null> {
        const requiresVerification =
            this.userUtil.requiresTwoFactorVerification(user);
        if (!requiresVerification) {
            return null;
        }

        return this.check(requestContext, apiKeyContext, user, input);
    }

    /** Checks the code or backup code against the confirmed secret and writes nothing on a match; a mismatch counts one failed attempt in its own transaction and throws AuthTwoFactorAttemptMaxException when it locked, else AuthTwoFactorInvalidException. */
    async check(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorCheck> {
        const method = this.getProvidedMethod(input.method);
        this.assertAttemptAvailable(user);
        const twoFactor = this.getEnabledTwoFactor(user);

        const checked = await this.checkCode(twoFactor, method, input);
        if (!checked) {
            const isLocked = await this.countFailedAttempt(
                requestContext,
                apiKeyContext,
                user
            );
            if (isLocked) {
                throw new AuthTwoFactorAttemptMaxException();
            }

            throw new AuthTwoFactorInvalidException();
        }

        return checked;
    }

    getProvidedMethod(
        method: EnumAuthTwoFactorMethod | null
    ): EnumAuthTwoFactorMethod {
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        return method;
    }

    /** Checks a code against the pending secret and writes nothing on a match, answering its TOTP step; a mismatch counts one failed attempt in its own transaction and throws AuthTwoFactorAttemptMaxException when it locked, else AuthTwoFactorInvalidException. */
    async checkSetupCode(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<number> {
        this.assertAttemptAvailable(user);
        const secret = this.readSecret(pendingSecret, user.id);
        const totpStep = this.authTwoFactorUtil.verifyCode(secret, code.trim());
        if (totpStep === null) {
            const isLocked = await this.countFailedAttempt(
                requestContext,
                apiKeyContext,
                user
            );
            if (isLocked) {
                throw new AuthTwoFactorAttemptMaxException();
            }

            throw new AuthTwoFactorInvalidException();
        }

        return totpStep;
    }

    /** Accepts the checked TOTP step once on the caller's transaction, a replayed step throwing AuthTwoFactorInvalidException, then resets the counter and the lock. */
    async verifyInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { totpStep }: IUserTwoFactorCheck
    ): Promise<void> {
        if (totpStep !== null) {
            await this.verifySetupCodeInTx(tx, userId, totpStep);

            return;
        }

        await this.resetAttemptInTx(tx, userId);
    }

    /** Accepts the checked setup TOTP step once on the caller's transaction, a replayed step throwing AuthTwoFactorInvalidException, then resets the counter and the lock. */
    async verifySetupCodeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        totpStep: number
    ): Promise<void> {
        const isStepAccepted =
            await this.userTwoFactorRepository.markTotpUsedInTx(
                tx,
                userId,
                totpStep
            );
        if (!isStepAccepted) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.resetAttemptInTx(tx, userId);
    }

    /** Generates the secret, its encrypted form bound to the user, and the otpauth URL for enrollment, storing nothing. */
    async setup(user: IUser): Promise<IUserTwoFactorSetupSecret> {
        const secret = this.authTwoFactorUtil.generateSecret();
        const encryptedSecret = this.authTwoFactorUtil.encryptSecret(
            secret,
            user.id
        );
        const otpauthUrl = this.authTwoFactorUtil.createKeyUri(
            user.email,
            secret
        );

        return { secret, otpauthUrl, encryptedSecret };
    }

    /** Stores the pending secret and adds the setup entry on the caller's transaction. */
    async saveSetupInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        encryptedSecret: string
    ): Promise<void> {
        await this.userTwoFactorRepository.setupTwoFactorInTx(
            tx,
            userId,
            encryptedSecret
        );
        const entry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId,
                createdBy: userId,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }

    getPendingSecret(user: IUser): string {
        const pendingSecret = user.twoFactor?.pendingSecret;
        if (!pendingSecret && user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        } else if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        return pendingSecret;
    }

    /** Makes the pending secret the account's secret and adds the enable entry on the caller's transaction; returns plain backup codes, storing only their hashes; a pending secret that no longer matches throws the setup-required exception. */
    async enableTwoFactorInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        pendingSecret: string
    ): Promise<string[]> {
        const backupCodes = await this.authTwoFactorUtil.generateBackupCodes();
        const isEnabled =
            await this.userTwoFactorRepository.enableTwoFactorInTx(
                tx,
                userId,
                pendingSecret,
                backupCodes.hashes
            );
        if (!isEnabled) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        const entry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userEnableTwoFactor,
                userId,
                createdBy: userId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return backupCodes.codes;
    }

    assertEnabled(user: IUser): void {
        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }
    }

    async disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        const isDisabled =
            await this.userTwoFactorRepository.disableTwoFactorInTx(tx, userId);
        if (!isDisabled) {
            throw new AuthTwoFactorNotEnabledException();
        }
    }

    async removeInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.deleteByUserInTx(tx, userId);
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.resetTwoFactorByAdminInTx(
            tx,
            userId
        );
    }

    async resetAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.resetTwoFactorAttemptInTx(
            tx,
            userId
        );
    }

    /** Persists a successful 2FA check in the caller's transaction; a backup code is consumed only while the stored codes are still the ones it was verified against, otherwise the check is rejected. */
    async recordVerificationInTx(
        tx: IDatabaseTransactionClient,
        user: IUser,
        verified: IUserTwoFactorVerifyResult
    ): Promise<void> {
        const recorded = await this.userTwoFactorRepository.verifyTwoFactorInTx(
            tx,
            user.id,
            verified,
            user.twoFactor?.backupCodes ?? []
        );
        if (!recorded) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    /** Replaces the backup codes and adds the regenerate entry on the caller's transaction; returns the plain codes; a guarded write that misses throws AuthTwoFactorNotEnabledException. */
    async regenerateTwoFactorBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext
    ): Promise<string[]> {
        const backupCodes = await this.authTwoFactorUtil.generateBackupCodes();
        const isRegenerated =
            await this.userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx(
                tx,
                authContext.userId,
                backupCodes.hashes
            );
        if (!isRegenerated) {
            throw new AuthTwoFactorNotEnabledException();
        }

        const entry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return backupCodes.codes;
    }

    async createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor> {
        return this.userTwoFactorRepository.createDisabledInTx(
            tx,
            userId,
            createdBy
        );
    }
}
