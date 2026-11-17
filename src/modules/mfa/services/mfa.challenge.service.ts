import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumMfaChallengePurpose,
    type MfaChallengeDevice,
} from '@generated/prisma-client/client';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { MfaChallengeEncryptionPurpose } from '@modules/mfa/constants/mfa.constant';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import type {
    IMfaChallenge,
    IMfaChallengeCreate,
    IMfaChallengeLogin,
    IMfaChallengePrepared,
    IMfaChallengeToken,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeRepository } from '@modules/mfa/repositories/mfa.challenge.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class MfaChallengeService {
    private readonly challengeTtlInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly mfaChallengeRepository: MfaChallengeRepository,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.challengeTtlInMs = this.configService.get<number>(
            'mfa.challengeTtlInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    private sealDevice(
        device: IDeviceIdentity | null,
        userId: string | null
    ): MfaChallengeDevice | null {
        if (device === null) {
            return null;
        }

        const { fingerprint, name, platform, notificationToken } = device;
        if (notificationToken === null || userId === null) {
            return {
                fingerprint,
                name,
                platform,
                encryptedNotificationToken: null,
            };
        }

        const encryptedNotificationToken =
            this.helperEncryptionService.aes256Encrypt(
                notificationToken,
                this.encryptionSecretKey,
                MfaChallengeEncryptionPurpose,
                userId
            );

        return { fingerprint, name, platform, encryptedNotificationToken };
    }

    private openDevice(
        device: MfaChallengeDevice | null,
        userId: string | null
    ): IDeviceIdentity | null {
        if (device === null) {
            return null;
        }

        const { fingerprint, name, platform, encryptedNotificationToken } =
            device;
        if (encryptedNotificationToken === null || userId === null) {
            return { fingerprint, name, platform, notificationToken: null };
        }

        const notificationToken = this.helperEncryptionService.aes256Decrypt(
            encryptedNotificationToken,
            this.encryptionSecretKey,
            MfaChallengeEncryptionPurpose,
            userId
        );

        return { fingerprint, name, platform, notificationToken };
    }

    private prepareCreate({
        purpose,
        userId,
        device,
        loginFrom,
        loginWith,
        webAuthnChallenge,
    }: IMfaChallengeCreate): IMfaChallengePrepared {
        const challengeToken = this.helperStringService.random(48);
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const now = this.helperDateService.create();
        const expiredAt = this.helperDateService.forward(
            now,
            Duration.fromObject({ milliseconds: this.challengeTtlInMs })
        );

        const sealedDevice = this.sealDevice(device, userId);

        return {
            challengeToken,
            data: {
                purpose,
                userId,
                tokenHash,
                webAuthnChallenge,
                device: sealedDevice,
                loginFrom,
                loginWith,
                expiredAt,
            },
        };
    }

    /** Stores the challenge row under the SHA-256 hash of a new token and answers the raw token; the push token is stored encrypted. */
    async create(input: IMfaChallengeCreate): Promise<IMfaChallengeToken> {
        const { challengeToken, data } = this.prepareCreate(input);
        await this.mfaChallengeRepository.create(data);

        return { challengeToken, expiresInMs: this.challengeTtlInMs };
    }

    /** Stores the challenge row on the given tx under the SHA-256 hash of a new token and answers the raw token; the push token is stored encrypted. */
    async createInTx(
        tx: IDatabaseTransactionClient,
        input: IMfaChallengeCreate
    ): Promise<IMfaChallengeToken> {
        const { challengeToken, data } = this.prepareCreate(input);
        await this.mfaChallengeRepository.createInTx(tx, data);

        return { challengeToken, expiresInMs: this.challengeTtlInMs };
    }

    /** Reads the live challenge of a token and purpose without claiming it; no live row throws MfaChallengeInvalidException. */
    async get(
        challengeToken: string,
        purpose: EnumMfaChallengePurpose
    ): Promise<IMfaChallenge> {
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const now = this.helperDateService.create();
        const row = await this.mfaChallengeRepository.findActiveByTokenHash(
            tokenHash,
            purpose,
            now
        );
        if (!row) {
            throw new MfaChallengeInvalidException();
        }

        const device = this.openDevice(row.device, row.userId);

        return {
            userId: row.userId,
            purpose: row.purpose,
            webAuthnChallenge: row.webAuthnChallenge,
            device,
            loginFrom: row.loginFrom,
            loginWith: row.loginWith,
        };
    }

    /** Reads the live login challenge of a token without claiming it; no live row, or a row missing its user, device, origin, or method, throws MfaChallengeInvalidException. */
    async getLogin(challengeToken: string): Promise<IMfaChallengeLogin> {
        const { userId, device, loginFrom, loginWith, webAuthnChallenge } =
            await this.get(challengeToken, EnumMfaChallengePurpose.login);
        if (
            userId === null ||
            device === null ||
            loginFrom === null ||
            loginWith === null
        ) {
            throw new MfaChallengeInvalidException();
        }

        return { userId, device, loginFrom, loginWith, webAuthnChallenge };
    }

    /** Reads the WebAuthn challenge of the live challenge of a token and purpose without claiming it; a row of another user, or one with no WebAuthn challenge, throws MfaChallengeInvalidException. */
    async getWebAuthnChallengeForUser(
        challengeToken: string,
        purpose: EnumMfaChallengePurpose,
        userId: string
    ): Promise<string> {
        const challenge = await this.get(challengeToken, purpose);
        if (
            challenge.userId !== userId ||
            challenge.webAuthnChallenge === null
        ) {
            throw new MfaChallengeInvalidException();
        }

        return challenge.webAuthnChallenge;
    }

    /** Claims the live challenge of a token and purpose on the given tx; a lost claim throws MfaChallengeInvalidException. */
    async consumeInTx(
        tx: IDatabaseTransactionClient,
        challengeToken: string,
        purpose: EnumMfaChallengePurpose,
        updatedBy: string
    ): Promise<void> {
        const tokenHash = this.helperHashService.sha256Hash(challengeToken);
        const now = this.helperDateService.create();
        const isClaimed = await this.mfaChallengeRepository.consumeInTx(
            tx,
            tokenHash,
            purpose,
            now,
            updatedBy
        );
        if (!isClaimed) {
            throw new MfaChallengeInvalidException();
        }
    }
}
