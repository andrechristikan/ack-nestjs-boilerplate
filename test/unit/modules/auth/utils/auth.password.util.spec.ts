import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';

describe('AuthPasswordUtil', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => boolean | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: AuthPasswordUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, boolean | number> = {
                'auth.password.temporaryExpiresInMs': 3600000,
                'auth.password.periodInDays': 90,
                'auth.password.temporaryLength': 14,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthPasswordUtil,
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(AuthPasswordUtil);
    });

    describe('isPasswordMatched', () => {
        it('delegates to the argon2 compare', async () => {
            helperHashService.argon2Compare.mockResolvedValue(true);

            const result = await util.isPasswordMatched('plain', 'hash');

            expect(result).toBe(true);
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'plain',
                'hash'
            );
        });
    });

    describe('createPassword', () => {
        it('answers a null expiry for a regular password', async () => {
            const today = new Date('2026-01-01T00:00:00.000Z');
            const periodExpired = new Date('2026-04-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperHashService.argon2Hash.mockResolvedValue(
                '$argon2id$hashed-password'
            );
            const periodDuration = Duration.fromObject({ days: 90 });
            helperDateService.createDuration.mockReturnValue(periodDuration);
            helperDateService.forward.mockReturnValue(periodExpired);

            const result = await util.createPassword('plain-password');

            expect(result).toEqual({
                passwordHash: '$argon2id$hashed-password',
                passwordExpired: null,
                passwordCreated: today,
                passwordPeriodExpired: periodExpired,
            });
            expect(helperHashService.argon2Hash).toHaveBeenCalledWith(
                'plain-password'
            );
            expect(helperDateService.createDuration).toHaveBeenCalledTimes(1);
            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                days: 90,
            });
        });

        it('sets the temporary expiry ahead of today when temporary is set', async () => {
            const today = new Date('2026-01-01T00:00:00.000Z');
            const expired = new Date('2026-01-01T01:00:00.000Z');
            const periodExpired = new Date('2026-04-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperHashService.argon2Hash.mockResolvedValue(
                '$argon2id$hashed-password'
            );
            const expiredDuration = Duration.fromObject({
                milliseconds: 3600000,
            });
            const periodDuration = Duration.fromObject({ days: 90 });
            helperDateService.createDuration.mockImplementation(input =>
                'days' in input ? periodDuration : expiredDuration
            );
            helperDateService.forward.mockImplementation((_date, duration) =>
                duration === expiredDuration ? expired : periodExpired
            );

            const result = await util.createPassword('plain-password', {
                temporary: true,
            });

            expect(result.passwordExpired).toBe(expired);
            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 3600000,
            });
        });
    });

    describe('createPasswordRandom', () => {
        it('generates a random password of the configured temporary length', () => {
            helperStringService.random.mockReturnValue('random-pass');

            const result = util.createPasswordRandom();

            expect(result).toBe('random-pass');
            expect(helperStringService.random).toHaveBeenCalledWith(14);
        });
    });

    describe('isPasswordExpired', () => {
        it('returns false when no expiry is set', () => {
            expect(util.isPasswordExpired(null)).toBe(false);
        });

        it('returns true when the expiry date has passed', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-02-01T00:00:00.000Z')
            );

            const result = util.isPasswordExpired(
                new Date('2026-01-01T00:00:00.000Z')
            );

            expect(result).toBe(true);
        });

        it('returns false when the expiry date has not passed', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );

            const result = util.isPasswordExpired(
                new Date('2026-02-01T00:00:00.000Z')
            );

            expect(result).toBe(false);
        });
    });

    describe('checkPasswordPeriod', () => {
        const history: PasswordHistory = {
            id: 'history-1',
            userId: 'user-1',
            password: 'old-hash',
            type: EnumPasswordHistoryType.profile,
            expiredAt: new Date('2026-04-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
        };

        it('returns the matching history record when the password was used before', async () => {
            const match = { ...history, id: 'history-2' };
            helperHashService.argon2Compare
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const result = await util.checkPasswordPeriod(
                [{ ...history, id: 'history-1' }, match],
                'plain-password'
            );

            expect(result).toBe(match);
        });

        it('stops at the first matching history row', async () => {
            const [first, second] = [
                { ...history, id: 'history-1' },
                { ...history, id: 'history-2' },
            ];
            const third = { ...history, id: 'history-3' };
            helperHashService.argon2Compare.mockResolvedValueOnce(true);

            const result = await util.checkPasswordPeriod(
                [first, second, third],
                'plain-password'
            );

            expect(result).toBe(first);
            expect(helperHashService.argon2Compare).toHaveBeenCalledTimes(1);
        });

        it('returns null when the password was never used before', async () => {
            helperHashService.argon2Compare.mockResolvedValue(false);

            const result = await util.checkPasswordPeriod(
                [history],
                'plain-password'
            );

            expect(result).toBeNull();
        });

        it('returns null for an empty history list', async () => {
            const result = await util.checkPasswordPeriod([], 'plain-password');

            expect(result).toBeNull();
        });
    });

    describe('createContextWords', () => {
        it('returns the application name, the email local part, the username, and the name', () => {
            expect(
                util.createContextWords(
                    'ACK Boilerplate',
                    'john.doe@example.com',
                    'johnny',
                    'John Doe'
                )
            ).toEqual(['ACK Boilerplate', 'john.doe', 'johnny', 'John Doe']);
        });

        it('skips a null username and a null name', () => {
            expect(
                util.createContextWords(
                    'ACK Boilerplate',
                    'john.doe@example.com',
                    null,
                    null
                )
            ).toEqual(['ACK Boilerplate', 'john.doe']);
        });
    });

    describe('getPasswordPeriodInDays', () => {
        it('returns the configured password period in days', () => {
            expect(util.getPasswordPeriodInDays()).toBe(90);
        });
    });
});
