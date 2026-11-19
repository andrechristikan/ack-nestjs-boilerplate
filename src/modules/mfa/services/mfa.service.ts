import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Mfa } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import type {
    IMfaBackupCodes,
    IMfaCheck,
    IMfaPasskeyCredential,
    IMfaStatus,
    IMfaVerifyInput,
} from '@modules/mfa/interfaces/mfa.interface';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { Duration } from 'luxon';

@Injectable()
export class MfaService {
    private readonly backupCodesCount: number;
    private readonly backupCodesLength: number;

    constructor(
        private readonly mfaRepository: MfaRepository,
        private readonly mfaTotpService: MfaTotpService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService,
        private readonly featureFlagService: FeatureFlagService
    ) {
        this.backupCodesCount = this.configService.get<number>(
            'mfa.backupCodes.count'
        )!;
        this.backupCodesLength = this.configService.get<number>(
            'mfa.backupCodes.length'
        )!;
    }

    private async generateBackupCodes(): Promise<IMfaBackupCodes> {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperStringService.randomUppercase(this.backupCodesLength)
        );
        const hashes = await Promise.all(
            codes.map(code => this.helperHashService.argon2Hash(code))
        );

        return { codes, hashes };
    }

    private async verifyBackupCode(
        backupCodes: string[],
        input: string
    ): Promise<string | null> {
        // Sequential by design: an argon2id compare over several hashes, stopping at the first match
        for (const hash of backupCodes) {
            const isMatch = await this.helperHashService.argon2Compare(
                input,
                hash
            );
            if (isMatch) {
                return hash;
            }
        }

        return null;
    }

    private assertNotLocked(mfa: Mfa | null): void {
        const now = this.helperDateService.create();
        const lockedUntil = mfa?.lockedUntil ?? null;
        if (lockedUntil !== null && lockedUntil > now) {
            throw new MfaAttemptMaxException();
        }
    }

    private async throwFailedAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        method: EnumMfaMethod
    ): Promise<never> {
        const isLocked = await this.countFailedAttempt(
            requestContext,
            apiKeyContext,
            userId
        );
        if (isLocked) {
            throw new MfaAttemptMaxException();
        }

        if (method === EnumMfaMethod.passkey) {
            throw new MfaPasskeyInvalidException();
        }

        throw new MfaInvalidException();
    }

    private async checkBackupCode(
        mfa: Mfa | null,
        backupCode: string | null
    ): Promise<IMfaCheck | null> {
        const backupCodes = mfa?.backupCodes ?? [];
        if (backupCodes.length === 0) {
            throw new MfaMethodUnavailableException();
        }

        const normalizedCode = backupCode?.trim();
        if (!normalizedCode) {
            return null;
        }

        const backupCodeHash = await this.verifyBackupCode(
            backupCodes,
            normalizedCode
        );

        return backupCodeHash === null
            ? null
            : {
                  method: EnumMfaMethod.backupCode,
                  totpStep: null,
                  backupCodeHash,
                  passkey: null,
              };
    }

    private getMetadataKey(
        method: EnumMfaMethod.totp | EnumMfaMethod.passkey
    ): EnumFeatureFlagMetadataKey {
        return method === EnumMfaMethod.totp
            ? EnumFeatureFlagMetadataKey.totpAllowed
            : EnumFeatureFlagMetadataKey.passkeyAllowed;
    }

    private async isFactorEffective(
        isStored: boolean,
        metadataKey: EnumFeatureFlagMetadataKey
    ): Promise<boolean> {
        if (!isStored) {
            return false;
        }

        return this.featureFlagService.isMetadataAllowed(
            EnumFeatureFlagKey.mfa,
            metadataKey
        );
    }

    private async checkProof(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        method: EnumMfaMethod,
        { code, backupCode, passkeyResponse }: IMfaVerifyInput,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheck> {
        // Sequential by design: gate before the work it guards
        const mfa = await this.mfaRepository.findOneByUserId(userId);
        this.assertNotLocked(mfa);

        let checked: IMfaCheck | null;
        if (method === EnumMfaMethod.totp) {
            const totpStep = await this.mfaTotpService.checkCode(userId, code);
            checked =
                totpStep === null
                    ? null
                    : {
                          method,
                          totpStep,
                          backupCodeHash: null,
                          passkey: null,
                      };
        } else if (method === EnumMfaMethod.passkey) {
            const passkey = await this.mfaPasskeyService.checkAssertion(
                userId,
                passkeyResponse,
                webAuthnChallenge
            );
            checked =
                passkey === null
                    ? null
                    : {
                          method,
                          totpStep: null,
                          backupCodeHash: null,
                          passkey,
                      };
        } else {
            checked = await this.checkBackupCode(mfa, backupCode);
        }

        if (checked === null) {
            return this.throwFailedAttempt(
                requestContext,
                apiKeyContext,
                userId,
                method
            );
        }

        return checked;
    }

    async assertEnrolmentAllowed(
        method: EnumMfaMethod.totp | EnumMfaMethod.passkey
    ): Promise<void> {
        const metadataKey = this.getMetadataKey(method);

        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.mfa,
            metadataKey
        );
    }

    async assertHasFactor(userId: string): Promise<void> {
        const [hasTotp, hasPasskey] = await Promise.all([
            this.mfaTotpService.existsConfirmed(userId),
            this.mfaPasskeyService.existsByUser(userId),
        ]);

        if (!hasTotp && !hasPasskey) {
            throw new MfaNotEnabledException();
        }
    }

    async isEnabled(userId: string): Promise<boolean> {
        const [hasTotp, hasPasskey] = await Promise.all([
            this.mfaTotpService.existsConfirmed(userId),
            this.mfaPasskeyService.existsByUser(userId),
        ]);
        const [isTotpEffective, isPasskeyEffective] = await Promise.all([
            this.isFactorEffective(
                hasTotp,
                EnumFeatureFlagMetadataKey.totpAllowed
            ),
            this.isFactorEffective(
                hasPasskey,
                EnumFeatureFlagMetadataKey.passkeyAllowed
            ),
        ]);

        return isTotpEffective || isPasskeyEffective;
    }

    async assertEnabled(userId: string): Promise<void> {
        const isEnabled = await this.isEnabled(userId);
        if (!isEnabled) {
            throw new MfaNotEnabledException();
        }
    }

    /** Answers the methods a login can finish with: totp and passkey for the factors the mfa flag allows, backupCode while one is effective and codes remain; empty when MFA is off. */
    async getLoginMethods(
        userId: string,
        passkeyCredentials: IMfaPasskeyCredential[]
    ): Promise<EnumMfaMethod[]> {
        const [mfa, hasTotp] = await Promise.all([
            this.mfaRepository.findOneByUserId(userId),
            this.mfaTotpService.existsConfirmed(userId),
        ]);
        const hasPasskey = passkeyCredentials.length > 0;
        const [isTotpEffective, isPasskeyEffective] = await Promise.all([
            this.isFactorEffective(
                hasTotp,
                EnumFeatureFlagMetadataKey.totpAllowed
            ),
            this.isFactorEffective(
                hasPasskey,
                EnumFeatureFlagMetadataKey.passkeyAllowed
            ),
        ]);
        if (!isTotpEffective && !isPasskeyEffective) {
            return [];
        }

        const methods: EnumMfaMethod[] = [];
        if (isTotpEffective) {
            methods.push(EnumMfaMethod.totp);
        }
        if (isPasskeyEffective) {
            methods.push(EnumMfaMethod.passkey);
        }
        if ((mfa?.backupCodes.length ?? 0) > 0) {
            methods.push(EnumMfaMethod.backupCode);
        }

        return methods;
    }

    async getStatus(userId: string): Promise<IMfaStatus> {
        const [mfa, totp, passkeys] = await Promise.all([
            this.mfaRepository.findOneByUserId(userId),
            this.mfaTotpService.getStatus(userId),
            this.mfaPasskeyService.getList(userId),
        ]);
        const [isTotpEffective, isPasskeyEffective] = await Promise.all([
            this.isFactorEffective(
                totp.isEnabled,
                EnumFeatureFlagMetadataKey.totpAllowed
            ),
            this.isFactorEffective(
                passkeys.length > 0,
                EnumFeatureFlagMetadataKey.passkeyAllowed
            ),
        ]);

        return {
            isEnabled: isTotpEffective || isPasskeyEffective,
            backupCodesRemaining: mfa?.backupCodes.length ?? 0,
            totp,
            passkeys,
        };
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<Mfa> {
        return this.mfaRepository.createInTx(tx, userId, createdBy);
    }

    async resetAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.mfaRepository.resetAttemptInTx(tx, userId, null);
    }

    /** Throws MfaAttemptMaxException while the lock of the user's Mfa row ends later than now. */
    async assertAttemptAvailable(userId: string): Promise<void> {
        const mfa = await this.mfaRepository.findOneByUserId(userId);
        this.assertNotLocked(mfa);
    }

    /** Counts one failed attempt in its own transaction and adds the userVerifyMfaFailed entry in it; true when it reached the budget, which locks MFA for the lock duration and adds the reach-max entry and the loginLocked effect beside it; a write conflict throws MfaAttemptMaxException. */
    async countFailedAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string
    ): Promise<boolean> {
        const [maxAttempts, lockDurationInMinutes] = await Promise.all([
            this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.mfaMaxAttempts
            ),
            this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes
            ),
        ]);
        const now = this.helperDateService.create();
        const lockedUntil = this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: lockDurationInMinutes })
        );
        const lockedUntilIso = this.helperDateService.formatToIso(lockedUntil);

        try {
            return await this.outboxService.withTransaction(async tx => {
                const isLocked = await this.mfaRepository.incrementAttemptInTx(
                    tx,
                    userId,
                    maxAttempts,
                    lockedUntil,
                    userId
                );
                const failedEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    null,
                    {
                        action: EnumActivityLogAction.userVerifyMfaFailed,
                        userId,
                        createdBy: userId,
                    }
                );
                if (!isLocked) {
                    await this.outboxService.addInTx(tx, failedEntry);

                    return false;
                }

                const reachMaxEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    null,
                    null,
                    {
                        action: EnumActivityLogAction.userReachMaxMfaAttempt,
                        userId,
                        createdBy: userId,
                    }
                );
                const methodLabel = this.messageService.setMessage(
                    'notification.loginLockedMethod.mfa'
                );
                const effect = this.notificationService.notify(
                    EnumNotificationKind.loginLocked,
                    {
                        userId,
                        proceedBy: userId,
                        method: EnumNotificationLoginLockedMethod.mfa,
                        methodLabel,
                        lockedUntil: lockedUntilIso,
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    failedEntry,
                    reachMaxEntry,
                    effect,
                ]);

                return true;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new MfaAttemptMaxException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Checks the method's proof and writes nothing on a match; a missing method, a method the mfa flag does not allow or the user has not enrolled, and a backup code with no effective factor or no code left throw uncounted, a lock throws MfaAttemptMaxException, and a mismatch counts one failure and throws MfaAttemptMaxException when it locked, else MfaPasskeyInvalidException for a passkey and MfaInvalidException for a code. */
    async check(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        input: IMfaVerifyInput,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheck> {
        if (input.method === null) {
            throw new MfaMethodRequiredException();
        }

        // Sequential by design: gate before the work it guards
        let isAllowed: boolean;
        if (input.method === EnumMfaMethod.backupCode) {
            isAllowed = await this.isEnabled(userId);
        } else {
            const metadataKey = this.getMetadataKey(input.method);
            isAllowed = await this.featureFlagService.isMetadataAllowed(
                EnumFeatureFlagKey.mfa,
                metadataKey
            );
        }
        if (!isAllowed) {
            throw new MfaMethodUnavailableException();
        }

        return this.checkProof(
            requestContext,
            apiKeyContext,
            userId,
            input.method,
            input,
            webAuthnChallenge
        );
    }

    /** Checks a passkey assertion for the passkey sign-in without reading the mfa flag; the lock and the failed-attempt count are those of check. */
    async checkPasskeyLogin(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        passkeyResponse: AuthenticationResponseJSON,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheck> {
        return this.checkProof(
            requestContext,
            apiKeyContext,
            userId,
            EnumMfaMethod.passkey,
            {
                method: EnumMfaMethod.passkey,
                code: null,
                backupCode: null,
                passkeyResponse,
            },
            webAuthnChallenge
        );
    }

    /** Answers the TOTP step of a setup code against the pending secret; a mismatch counts one failure and throws as check does. */
    async checkTotpSetupCode(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        code: string
    ): Promise<number> {
        // Sequential by design: gate before the work it guards
        await this.assertAttemptAvailable(userId);

        const totpStep = await this.mfaTotpService.checkSetupCode(userId, code);
        if (totpStep === null) {
            return this.throwFailedAttempt(
                requestContext,
                apiKeyContext,
                userId,
                EnumMfaMethod.totp
            );
        }

        return totpStep;
    }

    /** Resets the counter and the lock, then stamps the used passkey, accepts the checked TOTP step once, or removes the used backup code by its matched hash from the row read in the transaction, guarded on that row's codes; an absent hash or a guard miss throws MfaInvalidException. */
    async completeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { totpStep, backupCodeHash, passkey }: IMfaCheck
    ): Promise<void> {
        await this.mfaRepository.resetAttemptInTx(tx, userId, userId);

        if (passkey !== null) {
            await this.mfaPasskeyService.markUsedInTx(
                tx,
                passkey.id,
                passkey.counter,
                userId
            );

            return;
        }

        if (totpStep !== null) {
            await this.mfaTotpService.markUsedInTx(tx, userId, totpStep);

            return;
        }

        if (backupCodeHash !== null) {
            const mfa = await this.mfaRepository.findOneByUserIdInTx(
                tx,
                userId
            );
            if (mfa === null) {
                throw new MfaInvalidException();
            }

            if (!mfa.backupCodes.includes(backupCodeHash)) {
                throw new MfaInvalidException();
            }

            const remainingBackupCodes = mfa.backupCodes.filter(
                hash => hash !== backupCodeHash
            );
            const isConsumed = await this.mfaRepository.consumeBackupCodeInTx(
                tx,
                userId,
                mfa.backupCodes,
                remainingBackupCodes,
                userId
            );
            if (!isConsumed) {
                throw new MfaInvalidException();
            }
        }
    }

    /** Writes fresh backup codes and answers the plain ones when the row holds none; null when it holds codes. */
    async createBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<string[] | null> {
        const mfa = await this.mfaRepository.findOneByUserIdInTx(tx, userId);
        if (mfa === null || mfa.backupCodes.length > 0) {
            return null;
        }

        const backupCodes = await this.generateBackupCodes();
        const isCreated = await this.mfaRepository.createBackupCodesInTx(
            tx,
            userId,
            backupCodes.hashes
        );

        return isCreated ? backupCodes.codes : null;
    }

    /** Replaces the backup codes and answers the plain ones; a guarded write that misses throws MfaNotEnabledException. */
    async regenerateBackupCodesInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<string[]> {
        const backupCodes = await this.generateBackupCodes();
        const isRegenerated =
            await this.mfaRepository.regenerateBackupCodesInTx(
                tx,
                userId,
                backupCodes.hashes
            );
        if (!isRegenerated) {
            throw new MfaNotEnabledException();
        }

        return backupCodes.codes;
    }

    async clearBackupCodesIfNoFactorInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        const hasTotp = await this.mfaTotpService.existsConfirmedInTx(
            tx,
            userId
        );
        const hasPasskey = await this.mfaPasskeyService.existsByUserInTx(
            tx,
            userId
        );
        if (!hasTotp && !hasPasskey) {
            await this.mfaRepository.clearBackupCodesInTx(tx, userId);
        }
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.mfaTotpService.removeInTx(tx, userId);
        await this.mfaPasskeyService.deleteByUserInTx(tx, userId);
        await this.mfaRepository.resetByAdminInTx(tx, userId);
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.mfaTotpService.removeInTx(tx, userId);
        await this.mfaPasskeyService.deleteByUserInTx(tx, userId);
        await this.mfaRepository.deleteByUserInTx(tx, userId);
    }
}
