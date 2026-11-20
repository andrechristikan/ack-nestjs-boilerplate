import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import {
    MfaChallengeEncryptionPurpose,
    MfaTotpSecretEncryptionPurpose,
} from '@modules/mfa/constants/mfa.constant';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitEncryptionSecret,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { generateSync } from 'otplib';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { EnumFeatureFlagMetadataKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';

export interface IMfaPasskeyServiceDoubles {
    mfaPasskeyRepository: MockProxy<MfaPasskeyRepository>;
    configService: MockProxy<ConfigService>;
    featureFlagService: MockProxy<FeatureFlagService>;
}

export function createTotpCode(
    secret: string,
    atEpochInSeconds: number,
    periodInSeconds: number
): string {
    return generateSync({
        secret,
        strategy: 'totp',
        algorithm: 'sha1',
        digits: 6,
        period: periodInSeconds,
        epoch: atEpochInSeconds,
    });
}

export function buildClientDataJson(origin: string): string {
    return Buffer.from(
        JSON.stringify({
            type: 'webauthn.get',
            challenge: 'challenge-stored',
            origin,
        })
    ).toString('base64url');
}

export function stubBackupCodes(
    helperStringService: HelperStringService,
    helperHashService: HelperHashService,
    codes: string[]
): void {
    const randomUppercase = vi.spyOn(helperStringService, 'randomUppercase');
    for (const code of codes) {
        randomUppercase.mockReturnValueOnce(code);
    }
    vi.spyOn(helperHashService, 'argon2Hash').mockImplementation(
        async code => `$argon2id$hash-${code}`
    );
}

export async function createMfaPasskeyService(
    doubles: IMfaPasskeyServiceDoubles
): Promise<MfaPasskeyService> {
    const module = await Test.createTestingModule({
        providers: [
            MfaPasskeyService,
            {
                provide: MfaPasskeyRepository,
                useValue: doubles.mfaPasskeyRepository,
            },
            HelperDateService,
            { provide: ConfigService, useValue: doubles.configService },
            {
                provide: FeatureFlagService,
                useValue: doubles.featureFlagService,
            },
        ],
    }).compile();

    return module.get(MfaPasskeyService);
}

export function stubMfaMetadataNumbers(
    featureFlagService: MockProxy<FeatureFlagService>,
    maxAttempts: number,
    lockDurationInMinutes: number
): void {
    featureFlagService.getMetadataNumber.mockImplementation(
        async (_key, metadataKey) =>
            metadataKey === EnumFeatureFlagMetadataKey.mfaMaxAttempts
                ? maxAttempts
                : lockDurationInMinutes
    );
}

export function buildSealedMfaTotpSecret(
    plaintext: string,
    userId: string
): string {
    return new HelperEncryptionService().aes256Encrypt(
        plaintext,
        TestUnitKitEncryptionSecret,
        MfaTotpSecretEncryptionPurpose,
        userId
    );
}

export function buildSealedMfaChallengePushToken(
    plaintext: string,
    userId: string
): string {
    return new HelperEncryptionService().aes256Encrypt(
        plaintext,
        TestUnitKitEncryptionSecret,
        MfaChallengeEncryptionPurpose,
        userId
    );
}

export function buildOpenedMfaChallengePushToken(
    sealed: string,
    userId: string
): string {
    return new HelperEncryptionService().aes256Decrypt(
        sealed,
        TestUnitKitEncryptionSecret,
        MfaChallengeEncryptionPurpose,
        userId
    );
}

export async function createMfaTotpService(
    mfaTotpRepository: MockProxy<MfaTotpRepository>,
    sentryService: MockProxy<SentryService>,
    totpEncryptionSecret: string
): Promise<MfaTotpService> {
    const module = await Test.createTestingModule({
        providers: [
            MfaTotpService,
            { provide: MfaTotpRepository, useValue: mfaTotpRepository },
            { provide: SentryService, useValue: sentryService },
            ...TestUnitKitProviders,
            {
                provide: ConfigService,
                useValue: buildConfigService({
                    ...TestUnitKitConfigValues,
                    'mfa.totp.strategy': 'totp',
                    'mfa.totp.algorithm': 'sha1',
                    'mfa.totp.issuer': 'AckBoilerplate',
                    'mfa.totp.digits': 6,
                    'mfa.totp.periodInSeconds': 30,
                    'mfa.totp.window': 1,
                    'mfa.totp.secretLength': 20,
                    'mfa.totp.encryptionSecret': totpEncryptionSecret,
                }),
            },
        ],
    }).compile();

    return module.get(MfaTotpService);
}
