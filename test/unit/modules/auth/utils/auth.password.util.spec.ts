import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AuthPasswordUtil', () => {
    const today = new Date('2026-01-01T00:00:00.000Z');

    let util: AuthPasswordUtil;
    let helperHashService: HelperHashService;
    let helperStringService: HelperStringService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(today);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthPasswordUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'auth.password.temporaryExpiresInMs': 3600000,
                        'auth.password.periodInDays': 90,
                        'auth.password.temporaryLength': 14,
                    }),
                },
            ],
        }).compile();

        util = module.get(AuthPasswordUtil);
        helperHashService = module.get(HelperHashService);
        helperStringService = module.get(HelperStringService);
    });

    describe('isPasswordMatched', () => {
        it('returns true for the password the hash was made from', async () => {
            const hash = await helperHashService.argon2Hash('plain');

            await expect(util.isPasswordMatched('plain', hash)).resolves.toBe(
                true
            );
        });

        it('returns false for another password', async () => {
            const hash = await helperHashService.argon2Hash('plain');

            await expect(util.isPasswordMatched('other', hash)).resolves.toBe(
                false
            );
        });
    });

    describe('createPassword', () => {
        it('answers a null expiry for a regular password', async () => {
            const result = await util.createPassword('plain-password');

            expect(result).toEqual({
                passwordHash: expect.stringMatching(/^\$argon2id\$/),
                passwordExpired: null,
                passwordCreated: today,
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            await expect(
                helperHashService.argon2Compare(
                    'plain-password',
                    result.passwordHash
                )
            ).resolves.toBe(true);
        });

        it('sets the temporary expiry ahead of today when temporary is set', async () => {
            const result = await util.createPassword('plain-password', {
                temporary: true,
            });

            expect(result.passwordExpired).toEqual(
                new Date('2026-01-01T01:00:00.000Z')
            );
        });
    });

    describe('createPasswordRandom', () => {
        it('generates a random password of the configured temporary length', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-pass');

            const result = util.createPasswordRandom();

            expect(result).toBe('random-pass');
            expect(random).toHaveBeenCalledWith(14);
        });
    });

    describe('isPasswordExpired', () => {
        it('returns false when no expiry is set', () => {
            expect(util.isPasswordExpired(null)).toBe(false);
        });

        it('returns true when the expiry date has passed', () => {
            expect(
                util.isPasswordExpired(new Date('2025-12-01T00:00:00.000Z'))
            ).toBe(true);
        });

        it('returns false when the expiry date has not passed', () => {
            expect(
                util.isPasswordExpired(new Date('2026-02-01T00:00:00.000Z'))
            ).toBe(false);
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
            const [other, used] = await Promise.all([
                helperHashService.argon2Hash('other-password'),
                helperHashService.argon2Hash('plain-password'),
            ]);
            const match = { ...history, id: 'history-2', password: used };

            const result = await util.checkPasswordPeriod(
                [{ ...history, id: 'history-1', password: other }, match],
                'plain-password'
            );

            expect(result).toBe(match);
        });

        it('stops at the first matching history row', async () => {
            const hash = await helperHashService.argon2Hash('plain-password');
            const first = { ...history, id: 'history-1', password: hash };
            const second = { ...history, id: 'history-2', password: hash };
            const third = { ...history, id: 'history-3', password: hash };
            const compare = vi.spyOn(helperHashService, 'argon2Compare');

            const result = await util.checkPasswordPeriod(
                [first, second, third],
                'plain-password'
            );

            expect(result).toBe(first);
            expect(compare).toHaveBeenCalledTimes(1);
        });

        it('returns null when the password was never used before', async () => {
            const hash = await helperHashService.argon2Hash('other-password');

            const result = await util.checkPasswordPeriod(
                [{ ...history, password: hash }],
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
