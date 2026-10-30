import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { Duration } from 'luxon';

describe('UserPasswordUtil', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: UserPasswordUtil;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiredAt = new Date(now.getTime() + 15 * 60 * 1000);

    const configValues: Record<string, string | number> = {
        'home.url': 'https://example.com',
        'forgotPassword.reference.prefix': 'FGT',
        'forgotPassword.reference.length': 8,
        'forgotPassword.expiredInMs': 15 * 60 * 1000,
        'forgotPassword.tokenLength': 32,
        'forgotPassword.resendInMs': 5 * 60 * 1000,
        'forgotPassword.linkPattern': '{homeUrl}/reset?token={token}',
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
                UserPasswordUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();
        util = module.get(UserPasswordUtil);
    });

    describe('createReference', () => {
        it('builds a prefixed random reference', () => {
            helperStringService.random.mockReturnValue('random-ref');

            expect(util.createReference()).toBe('FGT-random-ref');
            expect(helperStringService.random).toHaveBeenCalledWith(8);
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

    describe('createForgot', () => {
        it('builds the reset link, hashed token, reference, and windows', () => {
            helperStringService.random
                .mockReturnValueOnce('random-token')
                .mockReturnValueOnce('random-ref');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/reset?token=random-token'
            );

            expect(util.createForgot()).toEqual({
                reference: 'FGT-random-ref',
                expiredAt,
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                resendInMinutes: 5,
                link: 'https://example.com/reset?token=random-token',
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'random-token'
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{homeUrl}/reset?token={token}',
                { homeUrl: 'https://example.com', token: 'random-token' }
            );
        });
    });
});
