import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type {
    IUser,
    IUserForgotPasswordCreate,
} from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserForgotPasswordUseCase', () => {
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();

    let useCase: UserForgotPasswordUseCase;

    const user: IUser = buildUser('user-linden', 'linden@example.com');
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
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(
                userPasswordService.createForgotPassword
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-linden',
                'linden@example.com',
                forgot
            );
        });

        it('answers empty and creates nothing when no active user holds the email', async () => {
            userPasswordService.prepareForgotPassword.mockResolvedValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
        });

        it('creates nothing when the prepare rejects', async () => {
            userPasswordService.prepareForgotPassword.mockRejectedValue(
                new Error('flag')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toThrow('flag');
            expect(
                userPasswordService.createForgotPassword
            ).not.toHaveBeenCalled();
        });
    });
});
