import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import {
    EnumActivityLogAction,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
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
    IUserLockoutEffect,
    IUserTwoFactorChecked,
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
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserTwoFactorService {
    private readonly maxAttempt: number;

    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly userUtil: UserUtil,
        private readonly configService: ConfigService
    ) {
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
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

    private checkCode(
        twoFactor: TwoFactor,
        method: EnumAuthTwoFactorMethod,
        { code, backupCode }: IUserTwoFactorVerifyInput
    ): IUserTwoFactorChecked | null {
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

        const backupValidation = this.authTwoFactorUtil.verifyBackupCode(
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

    private buildTwoFactorLockoutStages(
        userId: string
    ): IActivityLogInput<EnumActivityLogAction>[] {
        return [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId,
                createdBy: userId,
            },
        ];
    }

    lockoutEffect(userId: string): IUserLockoutEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.lockout,
            data: { userId },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
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

    /** Counts one two-factor attempt before the code is checked and, when the budget is spent, adds the lockout row and its activity entries in the count's transaction; false on a spent budget; a write conflict throws AuthTwoFactorAttemptMaxException. */
    async countAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser
    ): Promise<boolean> {
        try {
            return await this.outboxService.withTransaction(async tx => {
                const isCounted =
                    await this.userTwoFactorRepository.incrementAttemptInTx(
                        tx,
                        user.id,
                        this.maxAttempt
                    );
                if (!isCounted) {
                    const lockout = this.lockoutEffect(user.id);
                    const stages = this.buildTwoFactorLockoutStages(user.id);
                    const entries = stages.map(stage =>
                        this.activityLogService.recordEffect(
                            requestContext,
                            apiKeyContext,
                            null,
                            null,
                            stage
                        )
                    );
                    await this.outboxService.addManyInTx(tx, [
                        lockout,
                        ...entries,
                    ]);
                }

                return isCounted;
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

    /** Counts one two-factor attempt and throws AuthTwoFactorAttemptMaxException when the budget is spent. */
    async assertAttemptCounted(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser
    ): Promise<void> {
        const isAttemptCounted = await this.countAttempt(
            requestContext,
            apiKeyContext,
            user
        );
        if (!isAttemptCounted) {
            throw new AuthTwoFactorAttemptMaxException();
        }
    }

    /** Returns null when the user needs no two-factor check; otherwise requires a method, counts the attempt, and verifies the code. */
    async verifyIfRequired(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorVerifyResult | null> {
        const requiresVerification =
            this.userUtil.requiresTwoFactorVerification(user);
        if (!requiresVerification) {
            return null;
        }

        const method = this.getProvidedMethod(input.method);
        // Sequential by design: gate before the work it guards
        await this.assertAttemptCounted(requestContext, apiKeyContext, user);

        return this.verify(user, { ...input, method });
    }

    getProvidedMethod(
        method: EnumAuthTwoFactorMethod | null
    ): EnumAuthTwoFactorMethod {
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        return method;
    }

    /** Checks the code or backup code against the confirmed secret, accepts each TOTP step once, and resets the counter on a match; the caller counts the attempt and a backup code is not consumed here. */
    async verify(
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorVerifyResult> {
        const method = this.getProvidedMethod(input.method);
        const twoFactor = this.getEnabledTwoFactor(user);

        const checked = this.checkCode(twoFactor, method, input);
        if (!checked) {
            throw new AuthTwoFactorInvalidException();
        }

        if (checked.totpStep !== null) {
            // Sequential by design: a write that must not happen if an earlier step throws (the attempt resets only after the step is accepted)
            const isStepAccepted =
                await this.userTwoFactorRepository.markTotpUsed(
                    user.id,
                    checked.totpStep
                );
            if (!isStepAccepted) {
                throw new AuthTwoFactorInvalidException();
            }
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);

        return checked.verified;
    }

    /** Checks a code against the pending secret, accepts each TOTP step once, and resets the counter on a match; the caller counts the attempt. */
    async verifySetupCode(
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<void> {
        const secret = this.readSecret(pendingSecret, user.id);
        const totpStep = this.authTwoFactorUtil.verifyCode(secret, code.trim());
        if (totpStep === null) {
            throw new AuthTwoFactorInvalidException();
        }

        // Sequential by design: a write that must not happen if an earlier step throws (the attempt resets only after the step is accepted)
        const isStepAccepted = await this.userTwoFactorRepository.markTotpUsed(
            user.id,
            totpStep
        );
        if (!isStepAccepted) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);
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

    /** Stores the pending secret and adds the setup entry in the same transaction. */
    async saveSetup(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        encryptedSecret: string
    ): Promise<void> {
        await this.outboxService.withTransaction(async tx => {
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
        });
    }

    /** Stores the pending secret and consumes the verified backup code, adding the setup entry, in one transaction; the code is consumed only while the stored codes are still the ones it was verified against, otherwise, or on a write conflict, the setup is rejected. */
    async saveSetupConsumingBackupCode(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        encryptedSecret: string,
        verified: IUserTwoFactorVerifyResult
    ): Promise<void> {
        try {
            await this.outboxService.withTransaction(async tx => {
                const isSetUp =
                    await this.userTwoFactorRepository.setupTwoFactorConsumingBackupCodeInTx(
                        tx,
                        user.id,
                        encryptedSecret,
                        verified,
                        user.twoFactor?.backupCodes ?? []
                    );
                if (!isSetUp) {
                    throw new AuthTwoFactorInvalidException();
                }

                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    null,
                    {
                        action: EnumActivityLogAction.userSetupTwoFactor,
                        userId: user.id,
                        createdBy: user.id,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorInvalidException();
            }

            throw new AppUnknownException(err);
        }
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

    /** Makes the pending secret the account's secret and adds the enable entry in the same transaction; returns plain backup codes, storing only their hashes; a pending secret that no longer matches, or a write conflict over it, throws the setup-required exception. */
    async enableTwoFactor(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        pendingSecret: string
    ): Promise<string[]> {
        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.outboxService.withTransaction(async tx => {
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
            });

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorSetupRequiredException();
            }

            throw new AppUnknownException(err);
        }
    }

    assertEnabled(user: IUser): void {
        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }
    }

    getBackupCodeForSetup(
        user: IUser,
        backupCode: string | null
    ): string | null {
        if (!user.twoFactor?.enabled) {
            return null;
        }

        if (!backupCode) {
            throw new AuthTwoFactorBackupCodeRequiredException();
        }

        return backupCode;
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

    /** Replaces the backup codes and adds the regenerate entry in one transaction; returns the plain codes; a write conflict throws the not-enabled exception. */
    async regenerateTwoFactorBackupCodes(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext
    ): Promise<string[]> {
        const userId = authContext.userId;
        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.outboxService.withTransaction(async tx => {
                const isRegenerated =
                    await this.userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx(
                        tx,
                        userId,
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
            });

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorNotEnabledException();
            }

            throw new AppUnknownException(err);
        }
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
