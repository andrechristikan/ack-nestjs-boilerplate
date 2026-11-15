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
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUserReauthenticationCheck,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserSetupTwoFactorUseCase } from '@modules/user/use-cases/user.setup-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserSetupTwoFactorUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
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
    const withBackupCode: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: {
            verified: {
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: [],
            },
            totpStep: null,
        },
        verificationId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const setup: IUserTwoFactorSetup = {
            secret: 'secret',
            otpauthUrl: 'otpauth://totp/secret',
        };

        beforeEach(() => {
            userAuthService.assertReauthentication.mockResolvedValue(
                passwordOnly
            );
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                ...setup,
            });
        });

        it('asserts the re-authentication with the backup code as the two-factor proof', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    password: 'Current-pass1',
                    backupCode: 'BACKUP1',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorSetup,
                    password: 'Current-pass1',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'BACKUP1',
                    otp: null,
                }
            );
        });

        it('passes null for every field the request omits', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {}
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorSetup,
                    password: null,
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: null,
                    otp: null,
                }
            );
        });

        it('passes the email code of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { otp: '123456' }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.twoFactorSetup,
                    password: null,
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: null,
                    otp: '123456',
                }
            );
        });

        it('completes the re-authentication first in the transaction, then saves the pending secret and returns the setup', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).resolves.toEqual({ data: setup });

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
            ).toHaveBeenCalledBefore(userTwoFactorService.saveSetupInTx);
            expect(userTwoFactorService.saveSetupInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-marten',
                'encrypted-pending'
            );
            expect(userTwoFactorService.setup).toHaveBeenCalledWith(user);
        });

        it('saves the pending secret the same way when a backup code was the proof', async () => {
            userAuthService.assertReauthentication.mockResolvedValue(
                withBackupCode
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                { password: 'Current-pass1', backupCode: 'BACKUP1' }
            );

            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                user,
                withBackupCode
            );
            expect(userTwoFactorService.saveSetupInTx).toHaveBeenCalledOnce();
        });

        it('leaves the work undone when the re-authentication fails', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userAuthService.completeReauthenticationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { password: 'Current-pass1' }
                )
            ).rejects.toBe(failure);

            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorInvalidException on a write conflict when a two-factor proof was checked', async () => {
            const conflict = new Error('write conflict');
            userAuthService.assertReauthentication.mockResolvedValue(
                withBackupCode
            );
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
                    { password: 'Current-pass1', backupCode: 'BACKUP1' }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps a write conflict in AppUnknownException when no two-factor proof was checked', async () => {
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
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
                    { password: 'Current-pass1' }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
