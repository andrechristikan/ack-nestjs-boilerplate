import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';

describe('UserPasswordHttpService', () => {
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
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
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    } satisfies IUser;

    let service: UserPasswordHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserPasswordHttpService,
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
            ],
        }).compile();

        service = module.get(UserPasswordHttpService);
    });

    describe('updatePasswordByAdmin', () => {
        it('delegates to the domain and returns an empty response', async () => {
            userPasswordDomain.updatePasswordByAdmin.mockResolvedValue(
                undefined
            );

            const result = await service.updatePasswordByAdmin(
                'user-id',
                'admin-id'
            );

            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).toHaveBeenCalledWith('user-id', 'admin-id');
            expect(result).toEqual({});
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
