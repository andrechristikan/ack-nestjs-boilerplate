import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Duration } from 'luxon';
import {
    EnumPasswordHistoryType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';

describe('AuthPasswordUtil', () => {
    const helperHashService = mock<HelperHashService>();
    const helperDateService = mock<HelperDateService>();
    const helperStringService = mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => boolean | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: AuthPasswordUtil;

    function buildUser(overrides: Partial<User> = {}): User {
        return {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            isVerified: true,
            verifiedAt: null,
            email: 'jane@example.com',
            roleId: 'role-1',
            password: 'hashed',
            passwordExpired: null,
            passwordCreated: null,
            passwordAttempt: null,
            signUpAt: new Date('2026-01-01T00:00:00.000Z'),
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: EnumUserStatus.active,
            gender: null,
            countryId: 'country-1',
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: null,
            lastLoginWith: null,
            lastWorkspaceId: null,
            lastWorkspaceChangedAt: null,
            termPolicy: {
                termsOfService: true,
                privacy: true,
                marketing: false,
                cookies: true,
            },
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            ...overrides,
        };
    }

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, boolean | number> = {
                'auth.password.expiredInMs': 86400000,
                'auth.password.expiredTemporaryInMs': 3600000,
                'auth.password.saltLength': 12,
                'auth.password.periodInDays': 90,
                'auth.password.attempt': true,
                'auth.password.maxAttempt': 5,
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

    describe('validatePassword', () => {
        it('delegates to the bcrypt compare', () => {
            helperHashService.bcryptCompare.mockReturnValue(true);

            const result = util.validatePassword('plain', 'hash');

            expect(result).toBe(true);
            expect(helperHashService.bcryptCompare).toHaveBeenCalledWith(
                'plain',
                'hash'
            );
        });
    });

    describe('checkPasswordAttempt', () => {
        it('returns true when attempt tracking is on and the count reached the max', () => {
            const user = buildUser({ passwordAttempt: 5 });

            const result = util.checkPasswordAttempt(user);

            expect(result).toBe(true);
        });

        it('returns false when attempt tracking is on and the count is below the max', () => {
            const user = buildUser({ passwordAttempt: 1 });

            const result = util.checkPasswordAttempt(user);

            expect(result).toBe(false);
        });

        it('treats a null attempt count as zero', () => {
            const user = buildUser({ passwordAttempt: null });

            const result = util.checkPasswordAttempt(user);

            expect(result).toBe(false);
        });

        it('returns false when attempt tracking is off, however high the count is', async () => {
            configGet.mockImplementation((key: string) => {
                const values: Record<string, boolean | number> = {
                    'auth.password.expiredInMs': 86400000,
                    'auth.password.expiredTemporaryInMs': 3600000,
                    'auth.password.saltLength': 12,
                    'auth.password.periodInDays': 90,
                    'auth.password.attempt': false,
                    'auth.password.maxAttempt': 5,
                };
                return values[key];
            });
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    AuthPasswordUtil,
                    {
                        provide: HelperHashService,
                        useValue: helperHashService,
                    },
                    {
                        provide: HelperDateService,
                        useValue: helperDateService,
                    },
                    {
                        provide: HelperStringService,
                        useValue: helperStringService,
                    },
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            const trackingOffUtil = module.get(AuthPasswordUtil);
            const user = buildUser({ passwordAttempt: 99 });

            const result = trackingOffUtil.checkPasswordAttempt(user);

            expect(result).toBe(false);
        });
    });

    describe('createPassword', () => {
        it('builds the hash, expiry and period dates using the default duration', () => {
            const today = new Date('2026-01-01T00:00:00.000Z');
            const expired = new Date('2026-01-02T00:00:00.000Z');
            const periodExpired = new Date('2026-04-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperHashService.bcryptGenerateSalt.mockReturnValue('salt');
            helperHashService.bcryptHash.mockReturnValue('hashed-password');
            const expiredDuration = Duration.fromObject({
                milliseconds: 86400000,
            });
            const periodDuration = Duration.fromObject({ days: 90 });
            helperDateService.createDuration.mockImplementation(input =>
                'days' in input ? periodDuration : expiredDuration
            );
            helperDateService.forward.mockImplementation((_date, duration) =>
                duration === expiredDuration ? expired : periodExpired
            );

            const result = util.createPassword('plain-password');

            expect(result).toEqual({
                passwordHash: 'hashed-password',
                passwordExpired: expired,
                passwordCreated: today,
                passwordPeriodExpired: periodExpired,
            });
            expect(helperHashService.bcryptGenerateSalt).toHaveBeenCalledWith(
                12
            );
            expect(helperHashService.bcryptHash).toHaveBeenCalledWith(
                'plain-password',
                'salt'
            );
            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 86400000,
            });
        });

        it('uses the temporary expiry duration when temporary is set', () => {
            const today = new Date('2026-01-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperHashService.bcryptGenerateSalt.mockReturnValue('salt');
            helperHashService.bcryptHash.mockReturnValue('hashed-password');
            helperDateService.createDuration.mockReturnValue(
                Duration.fromObject({ milliseconds: 3600000 })
            );
            helperDateService.forward.mockReturnValue(today);

            util.createPassword('plain-password', { temporary: true });

            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 3600000,
            });
        });
    });

    describe('createPasswordRandom', () => {
        it('generates a random 10-character password', () => {
            helperStringService.random.mockReturnValue('random-pass');

            const result = util.createPasswordRandom();

            expect(result).toBe('random-pass');
            expect(helperStringService.random).toHaveBeenCalledWith(10);
        });
    });

    describe('checkPasswordExpired', () => {
        it('returns false when no expiry is set', () => {
            expect(util.checkPasswordExpired(undefined)).toBe(false);
            expect(util.checkPasswordExpired(null)).toBe(false);
        });

        it('returns true when the expiry date has passed', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-02-01T00:00:00.000Z')
            );

            const result = util.checkPasswordExpired(
                new Date('2026-01-01T00:00:00.000Z')
            );

            expect(result).toBe(true);
        });

        it('returns false when the expiry date has not passed', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );

            const result = util.checkPasswordExpired(
                new Date('2026-02-01T00:00:00.000Z')
            );

            expect(result).toBe(false);
        });
    });

    describe('checkPasswordPeriod', () => {
        function buildHistory(
            overrides: Partial<PasswordHistory> = {}
        ): PasswordHistory {
            return {
                id: 'history-1',
                userId: 'user-1',
                password: 'old-hash',
                type: EnumPasswordHistoryType.profile,
                expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                ...overrides,
            };
        }

        it('returns the matching history record when the password was used before', () => {
            const match = buildHistory({ id: 'history-2' });
            helperHashService.bcryptCompare
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const result = util.checkPasswordPeriod(
                [buildHistory({ id: 'history-1' }), match],
                'plain-password'
            );

            expect(result).toBe(match);
        });

        it('returns null when the password was never used before', () => {
            helperHashService.bcryptCompare.mockReturnValue(false);

            const result = util.checkPasswordPeriod(
                [buildHistory()],
                'plain-password'
            );

            expect(result).toBeNull();
        });

        it('returns null for an empty history list', () => {
            const result = util.checkPasswordPeriod([], 'plain-password');

            expect(result).toBeNull();
        });
    });

    describe('getPasswordPeriodInDays', () => {
        it('returns the configured password period in days', () => {
            expect(util.getPasswordPeriodInDays()).toBe(90);
        });
    });
});
