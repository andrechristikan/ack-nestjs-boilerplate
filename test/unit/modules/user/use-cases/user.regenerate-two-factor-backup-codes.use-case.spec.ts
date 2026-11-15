import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type {
    IUser,
    IUserTwoFactorCheck,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserRegenerateTwoFactorBackupCodesUseCase } from '@modules/user/use-cases/user.regenerate-two-factor-backup-codes.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserRegenerateTwoFactorBackupCodesUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserRegenerateTwoFactorBackupCodesUseCase;

    const twoFactor: TwoFactor = {
        id: 'two-factor-marten',
        userId: 'user-marten',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const user: IUser = {
        id: 'user-marten',
        name: 'Marten Cole',
        username: 'martenCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marten@example.com',
        roleId: 'role-marten',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-marten',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
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
            id: 'role-marten',
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
        twoFactor,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);
    const tx = {} as IDatabaseTransactionClient;
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const checked: IUserTwoFactorCheck = { verified, totpStep: 58123456 };

    beforeEach(async () => {
        vi.resetAllMocks();
        userTwoFactorService.check.mockResolvedValue(checked);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRegenerateTwoFactorBackupCodesUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserRegenerateTwoFactorBackupCodesUseCase);
    });

    describe('execute', () => {
        const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
            code: '123456',
        };

        it('checks the code before the transaction, then verifies and regenerates on one tx', async () => {
            const calls: string[] = [];
            userTwoFactorService.check.mockImplementation(async () => {
                calls.push('check');

                return checked;
            });
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userTwoFactorService.verifyInTx.mockImplementation(async () => {
                calls.push('verifyInTx');
            });
            userTwoFactorService.regenerateTwoFactorBackupCodesInTx.mockImplementation(
                async () => {
                    calls.push('regenerateInTx');

                    return ['CODE1', 'CODE2'];
                }
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
                data: { backupCodes: ['CODE1', 'CODE2'] },
            });
            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    method: EnumAuthTwoFactorMethod.code,
                    code: '123456',
                    backupCode: null,
                }
            );
            expect(userTwoFactorService.verifyInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                checked
            );
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodesInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext
            );
            expect(calls).toEqual([
                'check',
                'begin',
                'verifyInTx',
                'regenerateInTx',
                'commit',
            ]);
        });

        it('checks nothing when two-factor is not enabled', async () => {
            userTwoFactorService.assertEnabled.mockImplementation(() => {
                throw new Error('not enabled');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toThrow('not enabled');
            expect(userTwoFactorService.check).not.toHaveBeenCalled();
        });

        it('opens no transaction when the check rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.check.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodesInTx
            ).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the step is refused', async () => {
            const failure = new AuthTwoFactorInvalidException();
            userTwoFactorService.verifyInTx.mockRejectedValue(failure);

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
        });

        it('rethrows an app exception of the transaction unchanged', async () => {
            const failure = new AuthTwoFactorAttemptMaxException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);
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
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other transaction failure in the unknown exception', async () => {
            const cause = new Error('database exploded');
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
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });
    });
});
