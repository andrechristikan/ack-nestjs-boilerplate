import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { generateSync } from 'otplib';
import type { MockProxy } from 'vitest-mock-extended';
import type { HelperDateService } from '@common/helper/services/helper.date.service';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import type { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import type { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';

export interface IMfaPasskeyServiceDoubles {
    mfaPasskeyRepository: MockProxy<MfaPasskeyRepository>;
    helperDateService: MockProxy<HelperDateService>;
    configService: MockProxy<ConfigService>;
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
    helperStringService: MockProxy<HelperStringService>,
    helperHashService: MockProxy<HelperHashService>,
    codes: string[]
): void {
    for (const code of codes) {
        helperStringService.randomUppercase.mockReturnValueOnce(code);
    }
    helperHashService.argon2Hash.mockImplementation(
        async code => `$argon2id$hash-${code}`
    );
}

export async function createMfaPasskeyService(
    doubles: IMfaPasskeyServiceDoubles
): Promise<MfaPasskeyService> {
    vi.resetModules();
    const [
        { MfaPasskeyService: MfaPasskeyServiceClass },
        { MfaPasskeyRepository: MfaPasskeyRepositoryClass },
        { HelperDateService: HelperDateServiceClass },
    ] = await Promise.all([
        import('@modules/mfa/services/mfa.passkey.service'),
        import('@modules/mfa/repositories/mfa.passkey.repository'),
        import('@common/helper/services/helper.date.service'),
    ]);

    const module = await Test.createTestingModule({
        providers: [
            MfaPasskeyServiceClass,
            {
                provide: MfaPasskeyRepositoryClass,
                useValue: doubles.mfaPasskeyRepository,
            },
            {
                provide: HelperDateServiceClass,
                useValue: doubles.helperDateService,
            },
            { provide: ConfigService, useValue: doubles.configService },
        ],
    }).compile();

    return module.get(MfaPasskeyServiceClass);
}
