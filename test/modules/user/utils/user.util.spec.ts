import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor, User } from '@generated/prisma-client/client';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserUtil', () => {
    const configGet = vi.fn<(key: string) => RegExp | string[] | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: UserUtil;

    const configValues: Record<string, RegExp | string[]> = {
        'user.usernamePattern': /^[a-zA-Z0-9-_]+$/,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        util = module.get(UserUtil);
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
