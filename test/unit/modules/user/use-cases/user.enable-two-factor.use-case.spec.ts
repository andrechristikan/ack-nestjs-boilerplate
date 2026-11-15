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
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserEnableTwoFactorUseCase } from '@modules/user/use-cases/user.enable-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserEnableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx = {} as IDatabaseTransactionClient;

    let useCase: UserEnableTwoFactorUseCase;

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

    beforeEach(async () => {
        vi.resetAllMocks();
        userTwoFactorService.checkSetupCode.mockResolvedValue(58123456);
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
                { provide: UserPasswordService, useValue: userPasswordService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserEnableTwoFactorUseCase);
    });

    describe('execute', () => {
        const enableDto: UserTwoFactorEnableRequestDto = {
            code: '123456',
            password: 'Current-pass1',
        };

        it('asserts the password, checks the code against the pending secret, then resets, verifies, and enables on one tx', async () => {
            const calls: string[] = [];
            userAuthService.assertCurrentPassword.mockImplementation(
                async () => {
                    calls.push('assertCurrentPassword');
                }
            );
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.checkSetupCode.mockImplementation(async () => {
                calls.push('checkSetupCode');

                return 58123456;
            });
            userTwoFactorService.verifySetupCodeInTx.mockImplementation(
                async () => {
                    calls.push('verifySetupCodeInTx');
                }
            );
            userPasswordService.resetPasswordAttemptInTx.mockImplementation(
                async () => {
                    calls.push('resetPasswordAttemptInTx');
                }
            );
            userTwoFactorService.enableTwoFactorInTx.mockImplementation(
                async () => {
                    calls.push('enableTwoFactorInTx');

                    return ['CODE1'];
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).resolves.toEqual({
                data: { backupCodes: ['CODE1'] },
            });

            expect(userAuthService.assertCurrentPassword).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                'Current-pass1'
            );
            expect(userTwoFactorService.getPendingSecret).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.checkSetupCode).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                'pending-secret',
                '123456'
            );
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).toHaveBeenCalledWith(tx, 'user-marten', 58123456);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-marten');
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-marten',
                'pending-secret'
            );
            expect(calls).toEqual([
                'assertCurrentPassword',
                'checkSetupCode',
                'resetPasswordAttemptInTx',
                'verifySetupCodeInTx',
                'enableTwoFactorInTx',
            ]);
        });

        it('reads the actor id from the context actorUserId', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactorInTx.mockResolvedValue([
                'CODE1',
            ]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                enableDto
            );

            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'actor-other',
                'pending-secret'
            );
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'actor-other');
        });

        it('passes a null password for an absent one', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactorInTx.mockResolvedValue([
                'CODE1',
            ]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    code: '123456',
                }
            );

            expect(userAuthService.assertCurrentPassword).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                null
            );
        });

        it('verifies nothing when no pending secret exists', async () => {
            userTwoFactorService.getPendingSecret.mockImplementation(() => {
                throw new Error('no pending');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toThrow('no pending');
            expect(userTwoFactorService.checkSetupCode).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is rejected', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.checkSetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...enableDto,
                        code: '000000',
                    }
                )
            ).rejects.toBe(failure);
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });

        it('answers the password mismatch before any two-factor work', async () => {
            userAuthService.assertCurrentPassword.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        code: '123456',
                    }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                messagePath: 'user.error.passwordNotMatch',
            });

            expect(userTwoFactorService.checkSetupCode).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });

        it('answers the attempt limit from the setup check and writes nothing', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.checkSetupCode.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(limit);
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });

        it('resets no password counter and opens no transaction when the setup code is rejected', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.checkSetupCode.mockRejectedValue(
                new Error('invalid')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toThrow('invalid');

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows the guarded enable failure raised after the counter reset on the same transaction', async () => {
            const failure = new AuthTwoFactorSetupRequiredException();
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactorInTx.mockRejectedValue(failure);

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
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledBefore(userTwoFactorService.enableTwoFactorInTx);
        });

        it('answers AuthTwoFactorSetupRequiredException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
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
                    enableDto
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps an unknown transaction error in AppUnknownException', async () => {
            const cause = new Error('boom');
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
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
