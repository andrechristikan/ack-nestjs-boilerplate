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
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { UserRegenerateTwoFactorBackupCodesUseCase } from '@modules/user/use-cases/user.regenerate-two-factor-backup-codes.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserRegenerateTwoFactorBackupCodesUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserRegenerateTwoFactorBackupCodesUseCase;

    const user = buildUser('user-marten', 'marten@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const tx = {} as IDatabaseTransactionClient;
    const check: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: {
            verified: {
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            },
            totpStep: 58123456,
        },
        verificationId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(check);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRegenerateTwoFactorBackupCodesUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserRegenerateTwoFactorBackupCodesUseCase);
    });

    describe('execute', () => {
        const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
            password: 'Current-pass1',
            method: EnumAuthTwoFactorMethod.code,
            code: '654321',
        };

        it('asserts the re-authentication before the transaction, then completes and regenerates on one tx', async () => {
            userTwoFactorService.regenerateTwoFactorBackupCodesInTx.mockResolvedValue(
                ['CODE000001', 'CODE000002']
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({
                data: { backupCodes: ['CODE000001', 'CODE000002'] },
            });

            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.backupCodeRegenerate,
                    password: 'Current-pass1',
                    method: EnumAuthTwoFactorMethod.code,
                    code: '654321',
                    backupCode: null,
                    otp: null,
                }
            );
            expect(
                userAuthService.assertReauthentication
            ).toHaveBeenCalledBefore(outboxService.withTransaction);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                user,
                check
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userTwoFactorService.regenerateTwoFactorBackupCodesInTx
            );
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodesInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext
            );
        });

        it('passes a backup code and null for every omitted field', async () => {
            userTwoFactorService.regenerateTwoFactorBackupCodesInTx.mockResolvedValue(
                []
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'B1',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.backupCodeRegenerate,
                    password: null,
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'B1',
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
                    action: EnumUserReauthenticationAction.backupCodeRegenerate,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: '123456',
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
                    action: EnumUserReauthenticationAction.backupCodeRegenerate,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: null,
                }
            );
        });

        it('asserts nothing when two-factor is not enabled', async () => {
            const failure = new AuthTwoFactorNotEnabledException();
            userTwoFactorService.assertEnabled.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(
                userAuthService.assertReauthentication
            ).not.toHaveBeenCalled();
        });

        it('opens no transaction when the proof fails', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userAuthService.assertReauthentication.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(limit);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the completion refuses the proof', async () => {
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
                    dto
                )
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodesInTx
            ).not.toHaveBeenCalled();
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorNotEnabledException on a write conflict', async () => {
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
                    dto
                )
            ).rejects.toMatchObject({
                module: 'auth',
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
