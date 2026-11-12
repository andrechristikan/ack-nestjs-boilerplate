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
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type {
    IUser,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';

describe('UserForgotPasswordUseCase', () => {
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const context = buildRequestContext(null);

    let useCase: UserForgotPasswordUseCase;

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
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const forgot: IUserForgotPasswordCreate = {
        reference: 'FGT-linden',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        token: 'raw-token',
        hashedToken: 'hashed-token',
        expiredInMinutes: 15,
        resendInMinutes: 5,
        link: 'https://example.com/reset?token=raw-token',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserForgotPasswordUseCase,
                { provide: UserPasswordService, useValue: userPasswordService },
            ],
        }).compile();
        useCase = module.get(UserForgotPasswordUseCase);
    });

    describe('execute', () => {
        const dto: UserForgotPasswordRequestDto = {
            email: 'linden@example.com',
        };

        beforeEach(() => {
            userPasswordService.prepareForgotPassword.mockResolvedValue({
                user,
                forgot,
            });
        });

        it('creates the request with its notification and entry through the domain', async () => {
            await expect(useCase.execute(dto, context)).resolves.toEqual({});

            expect(
                userPasswordService.createForgotPassword
            ).toHaveBeenCalledWith(
                'user-linden',
                'linden@example.com',
                forgot,
                context
            );
        });

        it('answers empty and creates nothing when no active user holds the email', async () => {
            userPasswordService.prepareForgotPassword.mockResolvedValue(null);

            await expect(useCase.execute(dto, context)).resolves.toEqual({});

            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
        });

        it('creates nothing when the prepare rejects', async () => {
            userPasswordService.prepareForgotPassword.mockRejectedValue(
                new Error('flag')
            );

            await expect(useCase.execute(dto, context)).rejects.toThrow('flag');
            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
        });
    });
});
