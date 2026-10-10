import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserProfile,
    IUserTwoFactor,
    IUserTwoFactorSetup,
    IUserTwoFactorStatus,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserTwoFactorHttpService', () => {
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        twoFactor: null,
    } satisfies IUser;
    const tokens = {
        tokenType: 'Bearer',
        roleKey: EnumRolePlatformKey.user,
        roleScope: EnumRoleScope.platform,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    } satisfies IAuthToken;
    const twoFactorStatus = {
        id: 'two-factor-id',
        userId: 'user-id',
        secret: 'secret',
        pendingSecret: null,
        enabled: true,
        requiredSetup: false,
        confirmedAt: now,
        lastUsedAt: now,
        attempt: 0,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        backupCodes: [],
    } satisfies IUserTwoFactor;
    const twoFactorStatusResponse = {
        isEnabled: true,
        isPendingConfirmation: false,
        backupCodesRemaining: 0,
        confirmedAt: now,
        lastUsedAt: now,
    } satisfies IUserTwoFactorStatus;
    const twoFactorSetup = {
        secret: 'secret',
        otpauthUrl: 'otpauth://totp/example',
    } satisfies IUserTwoFactorSetup;

    const userProfile = {
        ...user,
        mobileNumbers: [],
        country: {
            id: 'country-id',
            name: 'Country',
            alpha2Code: 'CC',
            alpha3Code: 'CCC',
            continent: 'Continent',
            timezone: 'UTC',
            phoneCodes: ['+1'],
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        photo: null,
    } satisfies IUserProfile;
    let service: UserTwoFactorHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorHttpService,
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: PolicyAbilityDomain,
                    useValue: policyAbilityDomain,
                },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                { provide: UserUtil, useValue: userUtil },
            ],
        }).compile();

        service = module.get(UserTwoFactorHttpService);
    });

    describe('loginVerifyTwoFactor', () => {
        it('delegates to the domain and wraps the tokens', async () => {
            const request = {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.code,
                code: '654321',
                backupCode: undefined,
            } satisfies UserLoginVerifyTwoFactorRequestDto;
            userTwoFactorDomain.loginVerifyTwoFactor.mockResolvedValue(tokens);

            const result = await service.loginVerifyTwoFactor(request);

            expect(
                userTwoFactorDomain.loginVerifyTwoFactor
            ).toHaveBeenCalledWith('challenge-token', {
                code: request.code,
                backupCode: request.backupCode,
                method: request.method,
            });
            expect(result).toEqual({ data: tokens });
        });
    });

    describe('loginSetupTwoFactor', () => {
        it('delegates to the domain and wraps the backup codes', async () => {
            const request = {
                challengeToken: 'challenge-token',
                code: '654321',
            } satisfies UserLoginSetupTwoFactorRequestDto;
            userTwoFactorDomain.loginSetupTwoFactor.mockResolvedValue([
                'ABCD1234EF',
            ]);

            const result = await service.loginSetupTwoFactor(request);

            expect(
                userTwoFactorDomain.loginSetupTwoFactor
            ).toHaveBeenCalledWith('challenge-token', '654321');
            expect(result).toEqual({ data: { backupCodes: ['ABCD1234EF'] } });
        });
    });

    describe('getTwoFactorStatus', () => {
        it('maps the domain status through the util and wraps it', () => {
            userTwoFactorDomain.getTwoFactorStatus.mockReturnValue(
                twoFactorStatus
            );
            userUtil.mapTwoFactor.mockReturnValue(twoFactorStatusResponse);

            const result = service.getTwoFactorStatus(user);

            expect(userTwoFactorDomain.getTwoFactorStatus).toHaveBeenCalledWith(
                user
            );
            expect(userUtil.mapTwoFactor).toHaveBeenCalledWith(twoFactorStatus);
            expect(result).toEqual({ data: twoFactorStatusResponse });
        });
    });

    describe('setupTwoFactor', () => {
        it('passes the backup code through when provided', async () => {
            const request = {
                backupCode: 'ABCD1234EF',
            } satisfies UserTwoFactorSetupRequestDto;
            userTwoFactorDomain.setupTwoFactor.mockResolvedValue(
                twoFactorSetup
            );

            const result = await service.setupTwoFactor(user, request);

            expect(userTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                user,
                'ABCD1234EF'
            );
            expect(result).toEqual({ data: twoFactorSetup });
        });

        it('falls back to null when no backup code is provided', async () => {
            const request = {} satisfies UserTwoFactorSetupRequestDto;
            userTwoFactorDomain.setupTwoFactor.mockResolvedValue(
                twoFactorSetup
            );

            await service.setupTwoFactor(user, request);

            expect(userTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                user,
                null
            );
        });
    });

    describe('enableTwoFactor', () => {
        it('delegates to the domain and wraps the backup codes', async () => {
            const request = {
                code: '654321',
            } satisfies UserTwoFactorEnableRequestDto;
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue([
                'ABCD1234EF',
            ]);

            const result = await service.enableTwoFactor(user, request);

            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                user,
                '654321'
            );
            expect(result).toEqual({ data: { backupCodes: ['ABCD1234EF'] } });
        });
    });

    describe('disableTwoFactor', () => {
        it('delegates to the domain with the verification payload', async () => {
            const request = {
                code: '654321',
                backupCode: undefined,
                method: EnumAuthTwoFactorMethod.code,
            } satisfies UserTwoFactorDisableRequestDto;
            userTwoFactorDomain.disableTwoFactor.mockResolvedValue(undefined);

            await service.disableTwoFactor(user, request);

            expect(userTwoFactorDomain.disableTwoFactor).toHaveBeenCalledWith(
                user,
                {
                    code: request.code,
                    backupCode: request.backupCode,
                    method: request.method,
                }
            );
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('delegates to the domain and wraps the backup codes', async () => {
            const request = {
                code: '654321',
            } satisfies UserTwoFactorRegenerateBackupCodeRequestDto;
            userTwoFactorDomain.regenerateTwoFactorBackupCodes.mockResolvedValue(
                ['ABCD1234EF']
            );

            const result = await service.regenerateTwoFactorBackupCodes(
                user,
                request
            );

            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith(user, '654321');
            expect(result).toEqual({ data: { backupCodes: ['ABCD1234EF'] } });
        });
    });

    describe('resetTwoFactorByAdmin', () => {
        it('checks update on the loaded user and delegates to the domain', async () => {
            userDomain.getOne.mockResolvedValue(userProfile);
            userTwoFactorDomain.resetTwoFactorByAdmin.mockResolvedValue(
                undefined
            );

            await service.resetTwoFactorByAdmin('user-id', 'admin-id');

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.User, userProfile)
            );
            expect(
                userTwoFactorDomain.resetTwoFactorByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id');
        });

        it('throws PolicyForbiddenException and never calls the domain mutation when the record is denied', async () => {
            userDomain.getOne.mockResolvedValue(userProfile);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.resetTwoFactorByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                userTwoFactorDomain.resetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.resetTwoFactorByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                userTwoFactorDomain.resetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
        });
    });
});
