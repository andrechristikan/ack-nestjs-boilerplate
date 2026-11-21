import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { UserService } from '@modules/user/services/user.service';
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
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const tx = {} as IDatabaseTransactionClient;

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
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserForgotPasswordUseCase,
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
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

        it('answers AwsSesNotConfiguredException before any account read when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                userPasswordService.prepareForgotPassword
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens one transaction over createForgotPasswordInTx', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userPasswordService.createForgotPasswordInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-linden',
                'linden@example.com',
                forgot
            );
        });

        it('answers empty and opens no transaction when no active user holds the email', async () => {
            userPasswordService.prepareForgotPassword.mockResolvedValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.createForgotPasswordInTx
            ).not.toHaveBeenCalled();
        });

        it('opens no transaction when the prepare rejects', async () => {
            userPasswordService.prepareForgotPassword.mockRejectedValue(
                new Error('flag')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toThrow('flag');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
