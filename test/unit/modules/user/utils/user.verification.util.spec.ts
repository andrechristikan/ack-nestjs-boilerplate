import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumVerificationType } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Duration } from 'luxon';

describe('UserVerificationUtil', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: UserVerificationUtil;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiredAt = new Date(now.getTime() + 15 * 60 * 1000);

    const configValues: Record<string, string | number> = {
        'home.url': 'https://example.com',
        'verification.reference.prefix': 'VRF',
        'verification.reference.length': 8,
        'verification.otpLength': 6,
        'verification.expiredInMs': 15 * 60 * 1000,
        'verification.tokenLength': 32,
        'verification.resendInMs': 5 * 60 * 1000,
        'verification.linkPattern': '{homeUrl}/verify?token={token}',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
            ],
        }).compile();
        util = module.get(UserVerificationUtil);
    });

    describe('createReference', () => {
        it('builds a prefixed random reference', () => {
            helperStringService.random.mockReturnValue('random-ref');

            expect(util.createReference()).toBe('VRF-random-ref');
            expect(helperStringService.random).toHaveBeenCalledWith(8);
        });
    });

    describe('createOtp', () => {
        it('builds a random numeric code of the configured length', () => {
            helperNumberService.randomDigits.mockReturnValue('123456');

            expect(util.createOtp()).toBe('123456');
            expect(helperNumberService.randomDigits).toHaveBeenCalledWith(6);
        });
    });

    describe('createToken', () => {
        it('builds a random token of the configured length', () => {
            helperStringService.random.mockReturnValue('random-token');

            expect(util.createToken()).toBe('random-token');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
        });
    });

    describe('createExpiredAt', () => {
        it('forwards now by the configured expiry', () => {
            expect(util.createExpiredAt()).toEqual(expiredAt);
        });
    });

    describe('createMobile', () => {
        it('builds an OTP verification for a mobile number', () => {
            helperNumberService.randomDigits.mockReturnValue('654321');
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
            helperStringService.random.mockReturnValue('random-ref');

            expect(util.createMobile()).toEqual({
                reference: 'VRF-random-ref',
                expiredAt,
                type: EnumVerificationType.mobileNumber,
                token: '654321',
                hashedToken: 'hashed-otp',
                expiredInMinutes: 15,
                resendInMinutes: 5,
            });
        });
    });

    describe('createEmail', () => {
        it('builds a tokenized link verification for email', () => {
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            expect(util.createEmail()).toEqual({
                reference: 'VRF-random-token',
                expiredAt,
                type: EnumVerificationType.email,
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                link: 'https://example.com/verify?token=random-token',
                resendInMinutes: 5,
            });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{homeUrl}/verify?token={token}',
                { homeUrl: 'https://example.com', token: 'random-token' }
            );
        });
    });

    describe('createVerified', () => {
        it('builds the used and verified email verification', () => {
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');

            expect(util.createVerified('cobalt@example.com')).toEqual({
                reference: 'VRF-random-token',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                to: 'cobalt@example.com',
                expiredAt,
                verifiedAt: now,
                isUsed: true,
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'random-token'
            );
        });
    });
});
