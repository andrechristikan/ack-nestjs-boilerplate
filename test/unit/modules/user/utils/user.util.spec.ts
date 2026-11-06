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
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Duration } from 'luxon';

describe('UserUtil', () => {
    const configGet =
        vi.fn<(key: string) => string[] | string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let util: UserUtil;

    const configValues: Record<string, string[] | string | number> = {
        'message.availableLanguage': ['en'],
        'user.uploadPhotoProfilePath': 'users/{userId}/profile',
        'user.photo.maxSizeInBytes': 2048,
        'user.deleteSelf.emailPattern': 'removed.{id}.{email}',
        'user.deleteSelf.usernamePattern': 'removed.{id}.{username}',
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
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        util = module.get(UserUtil);
    });

    describe('createDeletedIdentity', () => {
        it('fills the configured deleted email and username patterns from the row id', () => {
            helperStringService.fillPattern
                .mockReturnValueOnce(
                    'deleted.user-marigold.marigold@example.com'
                )
                .mockReturnValueOnce('deleted.user-marigold.marigoldFinch');

            expect(util.createDeletedIdentity(iUser)).toEqual({
                email: 'deleted.user-marigold.marigold@example.com',
                username: 'deleted.user-marigold.marigoldFinch',
            });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'removed.{id}.{email}',
                { id: 'user-marigold', email: 'marigold@example.com' }
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'removed.{id}.{username}',
                { id: 'user-marigold', username: 'marigoldFinch' }
            );
        });
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

    describe('mapTwoFactor', () => {
        it('maps an enabled two-factor row with a pending secret', () => {
            const twoFactor: TwoFactor = {
                id: 'two-factor-marigold',
                userId: user.id,
                secret: 'secret',
                pendingSecret: 'pending-secret',
                backupCodes: ['code-one', 'code-two'],
                enabled: true,
                requiredSetup: false,
                confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
                lastUsedAt: new Date('2026-01-06T00:00:00.000Z'),
                lastUsedStep: null,
                attempt: 0,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };

            expect(util.mapTwoFactor(twoFactor)).toEqual({
                isEnabled: true,
                isPendingConfirmation: true,
                backupCodesRemaining: 2,
                confirmedAt: twoFactor.confirmedAt,
                lastUsedAt: twoFactor.lastUsedAt,
            });
        });

        it('maps a disabled two-factor row with no pending secret', () => {
            const twoFactor: TwoFactor = {
                id: 'two-factor-marigold',
                userId: user.id,
                secret: null,
                pendingSecret: null,
                backupCodes: [],
                enabled: false,
                requiredSetup: false,
                confirmedAt: null,
                lastUsedAt: null,
                lastUsedStep: null,
                attempt: 0,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };

            expect(util.mapTwoFactor(twoFactor)).toEqual({
                isEnabled: false,
                isPendingConfirmation: false,
                backupCodesRemaining: 0,
                confirmedAt: null,
                lastUsedAt: null,
            });
        });
    });

    describe('mapTwoFactor without a row', () => {
        it('maps a missing two-factor row as disabled', () => {
            expect(util.mapTwoFactor(null)).toEqual({
                isEnabled: false,
                isPendingConfirmation: false,
                backupCodesRemaining: 0,
                confirmedAt: null,
                lastUsedAt: null,
            });
        });
    });

    describe('buildPhotoProfilePath', () => {
        it('substitutes the user id in the configured path', () => {
            expect(util.buildPhotoProfilePath('user-marigold')).toBe(
                'users/user-marigold/profile'
            );
        });

        it('keeps a replacement pattern in the user id literal', () => {
            expect(util.buildPhotoProfilePath('$&')).toBe('users/$&/profile');
        });
    });

    describe('isPhotoSizeAllowed', () => {
        it('returns true at the configured maximum', () => {
            expect(util.isPhotoSizeAllowed(2048)).toBe(true);
        });

        it('returns false above the configured maximum', () => {
            expect(util.isPhotoSizeAllowed(2049)).toBe(false);
        });
    });

    describe('isPhotoProfileKeyOwned', () => {
        it('returns true when the key sits under the user photo path', () => {
            expect(
                util.isPhotoProfileKeyOwned(
                    'user-marigold',
                    'users/user-marigold/profile/random.png'
                )
            ).toBe(true);
        });

        it.each([
            'users/user-other/profile/random.png',
            'users/user-marigold-sibling/profile/random.png',
            'users/user-marigold/profile',
            'term-policies/privacy/1/en.pdf',
        ])(
            'returns false when the key %s sits outside the user photo path',
            key => {
                expect(util.isPhotoProfileKeyOwned('user-marigold', key)).toBe(
                    false
                );
            }
        );
    });

    describe('checkMobileNumber', () => {
        it('returns true when the phone code belongs to the country', () => {
            expect(util.checkMobileNumber(['+1', '+44'], '+1')).toBe(true);
        });

        it('returns false when the phone code does not belong to the country', () => {
            expect(util.checkMobileNumber(['+1', '+44'], '+33')).toBe(false);
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

    describe('isDeleteSelfRefused', () => {
        it('returns true for admin and superAdmin', () => {
            expect(
                util.isDeleteSelfRefused({
                    ...iUser,
                    role: { ...iUser.role, type: EnumRoleType.admin },
                })
            ).toBe(true);
            expect(
                util.isDeleteSelfRefused({
                    ...iUser,
                    role: { ...iUser.role, type: EnumRoleType.superAdmin },
                })
            ).toBe(true);
        });

        it('returns false for user', () => {
            expect(util.isDeleteSelfRefused(iUser)).toBe(false);
        });
    });

    describe('revokesSessionsOn', () => {
        it('returns false for active', () => {
            expect(util.revokesSessionsOn(EnumUserStatus.active)).toBe(false);
        });

        it('returns true for inactive', () => {
            expect(util.revokesSessionsOn(EnumUserStatus.inactive)).toBe(true);
        });

        it('returns true for blocked', () => {
            expect(util.revokesSessionsOn(EnumUserStatus.blocked)).toBe(true);
        });
    });

    describe('gatesPasswordExpiryOn', () => {
        it('returns true for credential', () => {
            expect(
                util.gatesPasswordExpiryOn(EnumUserLoginWith.credential)
            ).toBe(true);
        });

        it('returns false for socialGoogle', () => {
            expect(
                util.gatesPasswordExpiryOn(EnumUserLoginWith.socialGoogle)
            ).toBe(false);
        });

        it('returns false for socialApple', () => {
            expect(
                util.gatesPasswordExpiryOn(EnumUserLoginWith.socialApple)
            ).toBe(false);
        });
    });

    describe('resolveStatusActivityLogAction', () => {
        it('resolves userBlocked for blocked', () => {
            expect(
                util.resolveStatusActivityLogAction(EnumUserStatus.blocked)
            ).toBe(EnumActivityLogAction.userBlocked);
        });

        it('resolves userUpdateStatus for inactive', () => {
            expect(
                util.resolveStatusActivityLogAction(EnumUserStatus.inactive)
            ).toBe(EnumActivityLogAction.userUpdateStatus);
        });

        it('resolves userUpdateStatus for active', () => {
            expect(
                util.resolveStatusActivityLogAction(EnumUserStatus.active)
            ).toBe(EnumActivityLogAction.userUpdateStatus);
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

    describe('hasPassword', () => {
        it('returns true when the user holds a password hash', () => {
            expect(util.hasPassword({ ...iUser, password: 'hash' })).toBe(true);
        });

        it('returns false when the user has no password', () => {
            expect(util.hasPassword({ ...iUser, password: null })).toBe(false);
        });
    });

    describe('buildPasswordLockoutStages', () => {
        it('returns the revoke-all-sessions and max-password-attempt stages owned by the user', () => {
            expect(util.buildPasswordLockoutStages('user-1')).toEqual([
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
            ]);
        });
    });

    describe('buildTwoFactorLockoutStages', () => {
        it('returns the revoke-all-sessions and max-two-factor-attempt stages owned by the user', () => {
            expect(util.buildTwoFactorLockoutStages('user-1')).toEqual([
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
                {
                    action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                    userId: 'user-1',
                    createdBy: 'user-1',
                },
            ]);
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

    describe('requiresTwoFactorSetup', () => {
        const enabled = { ...twoFactorRow, enabled: true };

        it('returns true when the enabled row still requires setup', () => {
            expect(
                util.requiresTwoFactorSetup({
                    ...iUser,
                    twoFactor: { ...enabled, requiredSetup: true },
                })
            ).toBe(true);
        });

        it('returns false when the enabled row requires no setup', () => {
            expect(
                util.requiresTwoFactorSetup({
                    ...iUser,
                    twoFactor: { ...enabled, requiredSetup: false },
                })
            ).toBe(false);
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
