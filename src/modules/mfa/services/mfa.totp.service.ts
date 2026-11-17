import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { MfaTotpSecretEncryptionPurpose } from '@modules/mfa/constants/mfa.constant';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaTotpAlreadyEnabledException } from '@modules/mfa/exceptions/mfa.totp-already-enabled.exception';
import { MfaTotpNotEnabledException } from '@modules/mfa/exceptions/mfa.totp-not-enabled.exception';
import { MfaTotpSecretUnavailableException } from '@modules/mfa/exceptions/mfa.totp-secret-unavailable.exception';
import { MfaTotpSetupRequiredException } from '@modules/mfa/exceptions/mfa.totp-setup-required.exception';
import type {
    IMfaTotpSetup,
    IMfaTotpStatus,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import type { HashAlgorithm, OTPStrategy } from 'otplib';

@Injectable()
export class MfaTotpService {
    private readonly strategy: OTPStrategy;
    private readonly algorithm: HashAlgorithm;
    private readonly issuer: string;
    private readonly digits: number;
    private readonly periodInSeconds: number;
    private readonly window: number;
    private readonly secretLength: number;
    private readonly encryptionSecret: string;

    constructor(
        private readonly mfaTotpRepository: MfaTotpRepository,
        private readonly sentryService: SentryService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        this.strategy =
            this.configService.get<OTPStrategy>('mfa.totp.strategy')!;
        this.algorithm =
            this.configService.get<HashAlgorithm>('mfa.totp.algorithm')!;
        this.issuer = this.configService.get<string>('mfa.totp.issuer')!;
        this.digits = this.configService.get<number>('mfa.totp.digits')!;
        this.periodInSeconds = this.configService.get<number>(
            'mfa.totp.periodInSeconds'
        )!;
        this.window = this.configService.get<number>('mfa.totp.window')!;
        this.secretLength = this.configService.get<number>(
            'mfa.totp.secretLength'
        )!;
        this.encryptionSecret = this.configService.get<string>(
            'mfa.totp.encryptionSecret'
        )!;
    }

    private createKeyUri(email: string, secret: string): string {
        return generateURI({
            issuer: this.issuer,
            label: email,
            secret,
            digits: this.digits,
            period: this.periodInSeconds,
            strategy: this.strategy,
            algorithm: this.algorithm,
        });
    }

    private verifyCode(secret: string, code: string): number | null {
        const verified = verifySync({
            token: code,
            secret,
            algorithm: this.algorithm,
            strategy: this.strategy,
            digits: this.digits,
            period: this.periodInSeconds,
            epochTolerance: [this.window * this.periodInSeconds, 0],
        });

        if (!verified.valid || !('timeStep' in verified)) {
            return null;
        }

        return verified.timeStep;
    }

    private encryptSecret(secret: string, userId: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            secret,
            this.encryptionSecret,
            MfaTotpSecretEncryptionPurpose,
            userId
        );
    }

    private toDecryptException(
        err: unknown
    ): MfaTotpSecretUnavailableException | null {
        return err instanceof HelperDecryptFailedException
            ? new MfaTotpSecretUnavailableException()
            : null;
    }

    private readSecret(encryptedSecret: string, userId: string): string {
        try {
            return this.helperEncryptionService.aes256Decrypt(
                encryptedSecret,
                this.encryptionSecret,
                MfaTotpSecretEncryptionPurpose,
                userId
            );
        } catch (err: unknown) {
            const exception = this.toDecryptException(err);
            if (exception !== null) {
                this.sentryService.captureException(err);
            }

            throw exception ?? new AppUnknownException(err);
        }
    }

    async getStatus(userId: string): Promise<IMfaTotpStatus> {
        const totp = await this.mfaTotpRepository.findOneByUserId(userId);
        if (totp === null) {
            return {
                isEnabled: false,
                isPendingConfirmation: false,
                confirmedAt: null,
                lastUsedAt: null,
            };
        }

        return {
            isEnabled: totp.secret !== null,
            isPendingConfirmation: totp.pendingSecret !== null,
            confirmedAt: totp.confirmedAt,
            lastUsedAt: totp.lastUsedAt,
        };
    }

    async existsConfirmed(userId: string): Promise<boolean> {
        return this.mfaTotpRepository.existsConfirmed(userId);
    }

    async assertConfirmed(userId: string): Promise<void> {
        const isConfirmed =
            await this.mfaTotpRepository.existsConfirmed(userId);
        if (!isConfirmed) {
            throw new MfaTotpNotEnabledException();
        }
    }

    async existsConfirmedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        return this.mfaTotpRepository.existsConfirmedInTx(tx, userId);
    }

    async removeInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.mfaTotpRepository.deleteInTx(tx, userId);
    }

    /** Stores a new pending secret on the caller's transaction and answers it with its otpauth URL; a confirmed TOTP throws MfaTotpAlreadyEnabledException. */
    async setupInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string
    ): Promise<IMfaTotpSetup> {
        const totp = await this.mfaTotpRepository.findOneByUserIdInTx(
            tx,
            userId
        );
        if (totp?.secret) {
            throw new MfaTotpAlreadyEnabledException();
        }

        const secret = generateSecret({ length: this.secretLength });
        const encryptedSecret = this.encryptSecret(secret, userId);
        const otpauthUrl = this.createKeyUri(email, secret);
        await this.mfaTotpRepository.setupInTx(tx, userId, encryptedSecret);

        return { secret, otpauthUrl };
    }

    /** Answers the TOTP step of a code against the confirmed secret, null for a wrong or blank code; counts nothing. */
    async checkCode(
        userId: string,
        code: string | null
    ): Promise<number | null> {
        const totp = await this.mfaTotpRepository.findOneByUserId(userId);
        if (!totp?.secret) {
            throw new MfaMethodUnavailableException();
        }

        const normalizedCode = code?.trim();
        if (!normalizedCode) {
            return null;
        }

        const secret = this.readSecret(totp.secret, userId);

        return this.verifyCode(secret, normalizedCode);
    }

    /** Answers the TOTP step of a code against the pending secret, null for a wrong code; counts nothing. */
    async checkSetupCode(userId: string, code: string): Promise<number | null> {
        const totp = await this.mfaTotpRepository.findOneByUserId(userId);
        if (!totp?.pendingSecret) {
            if (totp?.secret) {
                throw new MfaTotpAlreadyEnabledException();
            }

            throw new MfaTotpSetupRequiredException();
        }

        const secret = this.readSecret(totp.pendingSecret, userId);

        return this.verifyCode(secret, code.trim());
    }

    /** Accepts a TOTP step once; a replayed step throws MfaInvalidException. */
    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number
    ): Promise<void> {
        const now = this.helperDateService.create();
        const isAccepted = await this.mfaTotpRepository.markUsedInTx(
            tx,
            userId,
            step,
            now,
            userId
        );
        if (!isAccepted) {
            throw new MfaInvalidException();
        }
    }

    /** Moves the pending secret into the confirmed one and stamps the step; a pending secret that no longer exists throws MfaTotpSetupRequiredException. */
    async enableInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        step: number
    ): Promise<void> {
        const totp = await this.mfaTotpRepository.findOneByUserIdInTx(
            tx,
            userId
        );
        if (!totp?.pendingSecret) {
            throw new MfaTotpSetupRequiredException();
        }

        const now = this.helperDateService.create();
        const isEnabled = await this.mfaTotpRepository.enableInTx(
            tx,
            userId,
            totp.pendingSecret,
            step,
            now
        );
        if (!isEnabled) {
            throw new MfaTotpSetupRequiredException();
        }
    }

    async disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        const isDisabled = await this.mfaTotpRepository.disableInTx(tx, userId);
        if (!isDisabled) {
            throw new MfaTotpNotEnabledException();
        }
    }
}
