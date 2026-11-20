import type { MockProxy } from 'vitest-mock-extended';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnumVerificationType } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserVerificationUtil', () => {
    let helperStringService: HelperStringService;
    let util: UserVerificationUtil;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiredAt = new Date(now.getTime() + 15 * 60 * 1000);

    let configService: MockProxy<ConfigService>;
    const hashedToken =
        'a67fa39caab4a23f78752354d1927f69d4e367be6229afb97c3aaddf7d138739';

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'frontend.baseUrl': 'https://example.com',
            'verification.reference.prefix': 'VRF',
            'verification.reference.length': 8,
            'verification.expiresInMinutes': 15,
            'verification.otpLength': 6,
            'verification.tokenLength': 32,
            'verification.resendInMinutes': 5,
            'verification.linkPattern':
                '{frontendBaseUrl}/verify?token={token}',
        });

        vi.setSystemTime(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationUtil,
                { provide: ConfigService, useValue: configService },
                HelperHashService,
                HelperDateService,
                HelperStringService,
            ],
        }).compile();
        util = module.get(UserVerificationUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('createEmail', () => {
        it('builds a tokenized link verification for email', () => {
            vi.spyOn(helperStringService, 'random').mockReturnValue(
                'random-token'
            );

            expect(util.createEmail()).toEqual({
                reference: 'VRF-random-token',
                expiredAt,
                type: EnumVerificationType.email,
                token: 'random-token',
                hashedToken,
                expiredInMinutes: 15,
                link: 'https://example.com/verify?token=random-token',
                resendInMinutes: 5,
            });
        });
    });

    describe('mapEmailContext', () => {
        it('maps the verification into the notification context with an RFC 2822 expiry', () => {
            const verification: IUserVerificationEmailCreate = {
                type: EnumVerificationType.email,
                reference: 'VRF-random-token',
                expiredAt,
                expiredInMinutes: 15,
                resendInMinutes: 5,
                token: 'random-token',
                hashedToken,
                link: 'https://example.com/verify?token=random-token',
            };

            expect(util.mapEmailContext('user-flint', verification)).toEqual({
                userId: 'user-flint',
                proceedBy: 'user-flint',
                link: 'https://example.com/verify?token=random-token',
                expiredAt: '2026-03-01T00:15:00.000Z',
                expiredInMinutes: 15,
                reference: 'VRF-random-token',
            });
        });
    });

    describe('createVerified', () => {
        it('builds the used and verified email verification', () => {
            vi.spyOn(helperStringService, 'random').mockReturnValue(
                'random-token'
            );

            expect(util.createVerified('cobalt@example.com')).toEqual({
                reference: 'VRF-random-token',
                token: hashedToken,
                type: EnumVerificationType.email,
                action: null,
                mobileNumberId: null,
                to: 'cobalt@example.com',
                expiredAt,
                verifiedAt: now,
                isUsed: true,
            });
        });
    });

    describe('createReference', () => {
        it('builds a prefixed random reference', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-ref');

            expect(util.createReference()).toBe('VRF-random-ref');
            expect(random).toHaveBeenCalledWith(8);
        });
    });

    describe('createToken', () => {
        it('builds a random token of the configured length', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-token');

            expect(util['createToken']()).toBe('random-token');
            expect(random).toHaveBeenCalledWith(32);
        });
    });

    describe('createExpiredAt', () => {
        it('forwards now by the configured expiry', () => {
            expect(util.createExpiredAt()).toEqual(expiredAt);
        });
    });
});
