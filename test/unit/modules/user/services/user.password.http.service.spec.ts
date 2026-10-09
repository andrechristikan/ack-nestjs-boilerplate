import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('UserPasswordHttpService', () => {
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();

    let service: UserPasswordHttpService;

    const user: IUser = {
        id: 'user-linden',
        name: 'Linden Frost',
        username: 'lindenFrost',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'linden@example.com',
        roleId: 'role-linden',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-linden',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
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
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-linden',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
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
            await expect(
                service.updatePasswordByAdmin('user-linden', 'admin-linden')
            ).resolves.toEqual({});
            expect(
                userPasswordDomain.updatePasswordByAdmin
            ).toHaveBeenCalledWith('user-linden', 'admin-linden');
        });
    });

    describe('changePassword', () => {
        it('delegates the change request to the domain', async () => {
            const dto: UserChangePasswordRequestDto = {
                newPassword: 'newPassword123!',
                oldPassword: 'oldPassword123!',
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            };

            await service.changePassword(user, dto);

            expect(userPasswordDomain.changePassword).toHaveBeenCalledWith(
                user,
                {
                    newPassword: dto.newPassword,
                    oldPassword: dto.oldPassword,
                    backupCode: null,
                    code: dto.code,
                    method: dto.method,
                }
            );
        });

        it('passes null for every omitted verification field', async () => {
            const dto: UserChangePasswordRequestDto = {
                newPassword: 'newPassword123!',
                oldPassword: 'oldPassword123!',
            };

            await service.changePassword(user, dto);

            expect(userPasswordDomain.changePassword).toHaveBeenCalledWith(
                user,
                {
                    newPassword: dto.newPassword,
                    oldPassword: dto.oldPassword,
                    backupCode: null,
                    code: null,
                    method: null,
                }
            );
        });
    });

    describe('forgotPassword', () => {
        it('delegates the email to the domain', async () => {
            const dto: UserForgotPasswordRequestDto = {
                email: 'linden@example.com',
            };

            await service.forgotPassword(dto);

            expect(userPasswordDomain.forgotPassword).toHaveBeenCalledWith(
                'linden@example.com'
            );
        });
    });

    describe('resetPassword', () => {
        it('delegates the reset request to the domain', async () => {
            const dto: UserForgotPasswordResetRequestDto = {
                newPassword: 'newPassword123!',
                token: 'raw-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            };

            await service.resetPassword(dto);

            expect(userPasswordDomain.resetPassword).toHaveBeenCalledWith({
                newPassword: dto.newPassword,
                token: dto.token,
                backupCode: dto.backupCode,
                code: null,
                method: dto.method,
            });
        });

        it('passes null for every omitted verification field', async () => {
            const dto: UserForgotPasswordResetRequestDto = {
                newPassword: 'newPassword123!',
                token: 'raw-token',
            };

            await service.resetPassword(dto);

            expect(userPasswordDomain.resetPassword).toHaveBeenCalledWith({
                newPassword: dto.newPassword,
                token: dto.token,
                backupCode: null,
                code: null,
                method: null,
            });
        });
    });
});
