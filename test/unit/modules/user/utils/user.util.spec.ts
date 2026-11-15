import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor, User } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Duration } from 'luxon';

describe('UserUtil', () => {
    const configGet = vi.fn<(key: string) => string[] | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let util: UserUtil;

    const configValues: Record<string, string[]> = {
        'message.availableLanguage': ['en'],
    };

    const user: User = {
        id: 'user-marigold',
        name: 'Marigold Finch',
        username: 'marigoldFinch',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marigold@example.com',
        roleId: 'role-marigold',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-marigold',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const twoFactorRow: TwoFactor = {
        id: 'two-factor-marigold',
        userId: user.id,
        secret: 'secret',
        pendingSecret: null,
        backupCodes: ['code-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const iUser: IUser = {
        ...user,
        role: {
            id: 'role-marigold',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        util = module.get(UserUtil);
    });

    describe('isInsideResendWindow', () => {
        const lastCreatedAt = new Date('2026-03-01T00:00:00.000Z');

        it('returns true one minute after the last request with a five-minute window', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-03-01T00:01:00.000Z')
            );

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(true);
        });

        it('returns false at the exact end of the window', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-03-01T00:05:00.000Z')
            );

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(false);
        });

        it('returns false once the window has passed', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-03-01T00:06:00.000Z')
            );

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(false);
        });
    });

    describe('checkUsernamePattern', () => {
        it('returns false when the username matches the allowed pattern', () => {
            expect(util.checkUsernamePattern('marigoldFinch')).toBe(false);
        });

        it('returns true when the username does not match the allowed pattern', () => {
            expect(util.checkUsernamePattern('marigold finch')).toBe(true);
        });
    });

    describe('checkBadWord', () => {
        it('returns true when the text contains a bad word', async () => {
            await expect(util.checkBadWord('damn')).resolves.toBe(true);
        });

        it('returns false when the text contains no bad word', async () => {
            await expect(util.checkBadWord('innocent')).resolves.toBe(false);
        });
    });

    describe('resolveLoginActivityLogAction', () => {
        it('resolves userLoginApple for socialApple', () => {
            expect(
                util.resolveLoginActivityLogAction(
                    EnumUserLoginWith.socialApple
                )
            ).toBe(EnumActivityLogAction.userLoginApple);
        });

        it('resolves userLoginGoogle for socialGoogle', () => {
            expect(
                util.resolveLoginActivityLogAction(
                    EnumUserLoginWith.socialGoogle
                )
            ).toBe(EnumActivityLogAction.userLoginGoogle);
        });

        it('resolves userLoginCredential for credential', () => {
            expect(
                util.resolveLoginActivityLogAction(EnumUserLoginWith.credential)
            ).toBe(EnumActivityLogAction.userLoginCredential);
        });

        it('resolves userLoginCredential for any other value', () => {
            expect(
                util.resolveLoginActivityLogAction(
                    'unknown' as EnumUserLoginWith
                )
            ).toBe(EnumActivityLogAction.userLoginCredential);
        });
    });

    describe('isUnverified', () => {
        it('returns false for a verified user', () => {
            expect(util.isUnverified(iUser)).toBe(false);
        });

        it('returns true for an unverified user', () => {
            expect(util.isUnverified({ ...iUser, isVerified: false })).toBe(
                true
            );
        });
    });

    describe('isTwoFactorEnabled', () => {
        it('returns false when the user has no two-factor row', () => {
            expect(util.isTwoFactorEnabled(iUser)).toBe(false);
        });

        it('returns false when the two-factor row is disabled', () => {
            expect(
                util.isTwoFactorEnabled({
                    ...iUser,
                    twoFactor: { ...twoFactorRow, enabled: false },
                })
            ).toBe(false);
        });

        it('returns true when the two-factor row is enabled', () => {
            expect(
                util.isTwoFactorEnabled({
                    ...iUser,
                    twoFactor: { ...twoFactorRow, enabled: true },
                })
            ).toBe(true);
        });
    });

    describe('requiresTwoFactorVerification', () => {
        const enabled = { ...twoFactorRow, enabled: true };

        it('returns true when the enabled row requires no setup', () => {
            expect(
                util.requiresTwoFactorVerification({
                    ...iUser,
                    twoFactor: { ...enabled, requiredSetup: false },
                })
            ).toBe(true);
        });

        it('returns false when the enabled row still requires setup', () => {
            expect(
                util.requiresTwoFactorVerification({
                    ...iUser,
                    twoFactor: { ...enabled, requiredSetup: true },
                })
            ).toBe(false);
        });

        it('returns false when the two-factor row is disabled', () => {
            expect(
                util.requiresTwoFactorVerification({
                    ...iUser,
                    twoFactor: { ...twoFactorRow, enabled: false },
                })
            ).toBe(false);
        });

        it('returns false when the user has no two-factor row', () => {
            expect(
                util.requiresTwoFactorVerification({
                    ...iUser,
                    twoFactor: null,
                })
            ).toBe(false);
        });
    });

    describe('mapActivityLogActorMetadata', () => {
        it('uses updatedAt as the timestamp', () => {
            expect(util.mapActivityLogActorMetadata(user)).toEqual({
                targetUserId: user.id,
                targetUsername: user.username,
                timestamp: user.updatedAt,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('uses updatedAt as the timestamp', () => {
            expect(
                util.mapActivityLogTargetMetadata(user, 'actor-marigold')
            ).toEqual({
                actorUserId: 'actor-marigold',
                timestamp: user.updatedAt,
            });
        });
    });
});
