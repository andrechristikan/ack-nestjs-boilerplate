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
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';

describe('UserPasswordHttpService', () => {
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
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
            policyRevision: 0,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        twoFactor: null,
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

    let service: UserPasswordHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        userDomain.getOne.mockResolvedValue(user);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordHttpService,
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: PolicyAbilityDomain,
                    useValue: policyAbilityDomain,
                },
            ],
        }).compile();

        service = module.get(UserPasswordHttpService);
    });

    describe('updatePasswordByAdmin', () => {
        it('loads the user by identity, authorizes update, and writes', async () => {
            userPasswordDomain.updatePasswordByAdmin.mockResolvedValue(
                undefined
            );

            const result = await service.updatePasswordByAdmin(
                'user-id',
                'admin-id'
            );

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.User, user)
            );
            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id');
            expect(result).toEqual({});
        });

        it('propagates UserNotFoundException from the identity load and does not authorize or write', async () => {
            userDomain.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                service.updatePasswordByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(UserNotFoundException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updatePasswordByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.User, user)
            );
            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and writes nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updatePasswordByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        it('delegates to the domain with the verification payload', async () => {
            const request = {
                newPassword: 'NewPassword1!!',
                oldPassword: 'OldPassword1!!',
                code: '654321',
                backupCode: undefined,
                method: EnumAuthTwoFactorMethod.code,
            } satisfies UserChangePasswordRequestDto;
            userPasswordDomain.changePassword.mockResolvedValue(undefined);

            await service.changePassword(user, request);

            expect(userPasswordDomain.changePassword).toHaveBeenCalledWith(
                user,
                {
                    newPassword: request.newPassword,
                    oldPassword: request.oldPassword,
                    backupCode: request.backupCode,
                    code: request.code,
                    method: request.method,
                }
            );
        });
    });

    describe('forgotPassword', () => {
        it('delegates to the domain with the email', async () => {
            const request = {
                email: 'user@example.com',
            } satisfies UserForgotPasswordRequestDto;
            userPasswordDomain.forgotPassword.mockResolvedValue(undefined);

            await service.forgotPassword(request);

            expect(userPasswordDomain.forgotPassword).toHaveBeenCalledWith(
                'user@example.com'
            );
        });
    });

    describe('resetPassword', () => {
        it('delegates to the domain with the reset payload', async () => {
            const request = {
                newPassword: 'NewPassword1!!',
                token: 'reset-token',
                code: '654321',
                backupCode: undefined,
                method: EnumAuthTwoFactorMethod.code,
            } satisfies UserForgotPasswordResetRequestDto;
            userPasswordDomain.resetPassword.mockResolvedValue(undefined);

            await service.resetPassword(request);

            expect(userPasswordDomain.resetPassword).toHaveBeenCalledWith({
                newPassword: request.newPassword,
                token: request.token,
                backupCode: request.backupCode,
                code: request.code,
                method: request.method,
            });
        });
    });
});
