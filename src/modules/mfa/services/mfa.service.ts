import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    EnumMfaChallengePurpose,
    Mfa,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import type {
    IMfaAttemptFailure,
    IMfaBackupCodes,
    IMfaCheck,
    IMfaCheckResult,
    IMfaPasskeyCredential,
    IMfaStatus,
    IMfaTotpSetupCheckResult,
    IMfaVerifyInput,
} from '@modules/mfa/interfaces/mfa.interface';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly outboxService: OutboxService,
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
        const matches = await Promise.all(
            backupCodes.map(hash =>
                this.helperHashService.argon2Compare(input, hash)
            )
        );

        return backupCodes.find((_hash, index) => matches[index]) ?? null;
    }

    private assertNotLocked(mfa: Mfa | null): void {
        const now = this.helperDateService.create();
        const lockedUntil = mfa?.lockedUntil ?? null;
        if (lockedUntil !== null && lockedUntil > now) {
            throw new MfaAttemptMaxException();
        }
    }

    private async createFailure(
        method: EnumMfaMethod
    ): Promise<IMfaAttemptFailure> {
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

        return { method, maxAttempts, lockedUntil };
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
        userId: string,
        method: EnumMfaMethod,
        { code, backupCode, passkeyResponse }: IMfaVerifyInput,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheckResult> {
        // Sequential by design: a credential proof, awaited alone
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
            const failure = await this.createFailure(method);

            return { check: null, failure };
        }

        return { check: checked, failure: null };
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

    /** Counts one failed attempt on the caller's transaction and adds the userMfaVerificationFailed entry on it; true when it reached the budget, which locks MFA until the failure's end and adds the reach-max entry and the loginLocked effect beside it. */
    async countFailedAttemptInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        { maxAttempts, lockedUntil }: IMfaAttemptFailure
    ): Promise<boolean> {
        const isLocked = await this.mfaRepository.incrementAttemptInTx(
            tx,
            userId,
            maxAttempts,
            lockedUntil,
            userId
        );
        const failedEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userMfaVerificationFailed,
                userId,
                createdBy: userId,
            }
        );
        if (!isLocked) {
            await this.outboxService.addInTx(tx, failedEntry);

            return false;
        }

        const reachMaxEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userMaxMfaAttemptReached,
                userId,
                createdBy: userId,
            }
        );
        const methodLabel = this.messageService.setMessage(
            'notification.loginLockedMethod.mfa'
        );
        const lockedUntilIso = this.helperDateService.formatToIso(lockedUntil);
        const effect = this.notificationQueue.notify(
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
    }

    /** Throws MfaAttemptMaxException when the counted failure locked MFA, else MfaPasskeyInvalidException for a passkey and MfaInvalidException for a code. */
    throwFailedAttempt(
        { method }: IMfaAttemptFailure,
        isLocked: boolean
    ): never {
        if (isLocked) {
            throw new MfaAttemptMaxException();
        }

        if (method === EnumMfaMethod.passkey) {
            throw new MfaPasskeyInvalidException();
        }

        throw new MfaInvalidException();
    }

    /** Checks the method's proof and writes nothing; a mismatch answers the failure with the flag budget and the lock end, while a missing method, a method the mfa flag does not allow or the user has not enrolled, and a backup code with no effective factor or no code left throw uncounted, and a lock throws MfaAttemptMaxException. */
    async check(
        userId: string,
        input: IMfaVerifyInput,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheckResult> {
        if (input.method === null) {
            throw new MfaMethodRequiredException();
        }

        // Sequential by design: a credential proof, awaited alone
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

        return this.checkProof(userId, input.method, input, webAuthnChallenge);
    }

    /** Checks a passkey assertion for the passkey sign-in without reading the mfa flag; the lock and the failure answer are those of check. */
    async checkPasskeyLogin(
        userId: string,
        passkeyResponse: AuthenticationResponseJSON,
        webAuthnChallenge: string | null
    ): Promise<IMfaCheckResult> {
        return this.checkProof(
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

    /** Answers the TOTP step and the encrypted pending secret of a setup code that matches it; a mismatch answers the failure and no secret. A lock throws MfaAttemptMaxException. */
    async checkTotpSetupCode(
        userId: string,
        code: string
    ): Promise<IMfaTotpSetupCheckResult> {
        // Sequential by design: a credential proof, awaited alone
        await this.assertAttemptAvailable(userId);

        const { totpStep, pendingSecret } =
            await this.mfaTotpService.checkSetupCode(userId, code);
        if (totpStep === null) {
            const failure = await this.createFailure(EnumMfaMethod.totp);

            return { totpStep: null, pendingSecret: null, failure };
        }

        return { totpStep, pendingSecret, failure: null };
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

    /** Claims the live challenge of the token and purpose, then completes the check, both on the given tx. */
    async completeChallengeInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        challengeToken: string,
        purpose: EnumMfaChallengePurpose,
        check: IMfaCheck
    ): Promise<void> {
        await this.mfaChallengeService.consumeInTx(
            tx,
            challengeToken,
            purpose,
            userId
        );
        await this.completeInTx(tx, userId, check);
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
        const [hasTotp, hasPasskey] = await Promise.all([
            this.mfaTotpService.existsConfirmedInTx(tx, userId),
            this.mfaPasskeyService.existsByUserInTx(tx, userId),
        ]);
        if (!hasTotp && !hasPasskey) {
            await this.mfaRepository.clearBackupCodesInTx(tx, userId);
        }
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await Promise.all([
            this.mfaTotpService.removeInTx(tx, userId),
            this.mfaPasskeyService.deleteByUserInTx(tx, userId),
            this.mfaRepository.resetByAdminInTx(tx, userId),
        ]);
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await Promise.all([
            this.mfaTotpService.removeInTx(tx, userId),
            this.mfaPasskeyService.deleteByUserInTx(tx, userId),
            this.mfaRepository.deleteByUserInTx(tx, userId),
        ]);
    }
}
