import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { UserEnableTwoFactorUseCase } from '@modules/user/use-cases/user.enable-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserEnableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserEnableTwoFactorUseCase;

    const user = buildUser('user-nell', 'nell@example.com');
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: null,
        verificationId: null,
    };
    const enableDto = { code: '654321', password: 'Current-pass1' };

    beforeEach(async () => {
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserEnableTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserEnableTwoFactorUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            userAuthService.assertReauthentication.mockResolvedValue(
                passwordOnly
            );
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.checkSetupCode.mockResolvedValue(42);
            userTwoFactorService.enableTwoFactorInTx.mockResolvedValue([
                'CODE000001',
            ]);
        });

        it('asserts the password with no old two-factor proof, then checks the code of the new authenticator', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                enableDto
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorEnable,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: null,
                }
            );
            expect(userTwoFactorService.checkSetupCode).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                'pending-secret',
                '654321'
            );
            expect(userTwoFactorService.check).not.toHaveBeenCalled();
            expect(
                userAuthService.assertReauthentication
            ).toHaveBeenCalledBefore(userTwoFactorService.checkSetupCode);
        });

        it('completes the re-authentication first in the transaction, accepts the setup step, then enables and returns the backup codes', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).resolves.toEqual({ data: { backupCodes: ['CODE000001'] } });

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                user,
                passwordOnly
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(userTwoFactorService.verifySetupCodeInTx);
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).toHaveBeenCalledWith(tx, 'user-nell', 42);
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).toHaveBeenCalledBefore(userTwoFactorService.enableTwoFactorInTx);
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-nell',
                'pending-secret'
            );
        });

        it('passes null for an omitted password', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { code: '654321' }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                expect.objectContaining({ password: null })
            );
        });

        it('passes the email code of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { code: '654321', otp: '123456' }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorEnable,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: '123456',
                }
            );
        });

        it('leaves the work undone when the password proof fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(userTwoFactorService.checkSetupCode).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('leaves the work undone when the new authenticator code is wrong', async () => {
            const failure = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.checkSetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userTwoFactorService.verifySetupCodeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorSetupRequiredException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toMatchObject({
                module: 'auth',
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
