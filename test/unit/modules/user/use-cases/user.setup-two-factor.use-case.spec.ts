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
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserTwoFactorSetup,
    IUserTwoFactorCheck,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserSetupTwoFactorUseCase } from '@modules/user/use-cases/user.setup-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserSetupTwoFactorUseCase;

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
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);
    const userContext = buildUserContext(user);

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
                { provide: UserPasswordService, useValue: userPasswordService },
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

        const setupDto: UserTwoFactorSetupRequestDto = {
            password: 'Current-pass1',
        };

        beforeEach(() => {
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                ...setup,
            });
        });

        it('asserts the password, then saves the pending secret with the passed context when two-factor is not enabled', async () => {
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    setupDto
                )
            ).resolves.toEqual({
                data: setup,
            });

            expect(userAuthService.assertCurrentPassword).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                'Current-pass1'
            );
            expect(
                userTwoFactorService.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, null);
            expect(userTwoFactorService.check).not.toHaveBeenCalled();
            expect(userTwoFactorService.verifyInTx).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).toHaveBeenCalledWith(user);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-marten');
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledBefore(userTwoFactorService.saveSetupInTx);
            expect(userTwoFactorService.saveSetupInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-marten',
                'encrypted-pending'
            );
            expect(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.assertCurrentPassword
            ).toHaveBeenCalledBefore(
                userTwoFactorService.getBackupCodeForSetup
            );
        });

        it('reads the actor id from the context actorUserId', async () => {
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                setupDto
            );

            expect(userTwoFactorService.saveSetupInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'actor-other',
                'encrypted-pending'
            );
        });

        it('passes a null password for an absent one', async () => {
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {}
            );

            expect(userAuthService.assertCurrentPassword).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                null
            );
        });

        it('checks the backup code before the transaction, then resets, verifies, and saves the pending secret consuming it on one tx when two-factor is enabled', async () => {
            const dto: UserTwoFactorSetupRequestDto = {
                ...setupDto,
                backupCode: 'BACKUP1',
            };
            const backupVerified: IUserTwoFactorVerifyResult = {
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: [],
            };
            const backupChecked: IUserTwoFactorCheck = {
                verified: backupVerified,
                totpStep: null,
            };
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockResolvedValue(backupChecked);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorService.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, 'BACKUP1');
            expect(userTwoFactorService.check).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: 'BACKUP1',
                }
            );
            expect(userTwoFactorService.check).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
            expect(userTwoFactorService.verifyInTx).toHaveBeenCalledWith(
                tx,
                'user-marten',
                backupChecked
            );
            expect(userTwoFactorService.verifyInTx).toHaveBeenCalledBefore(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            );
            expect(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                user,
                'encrypted-pending',
                backupVerified
            );
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-marten');
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledBefore(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            );
            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
        });

        it('generates and saves nothing when the backup code gate rejects', async () => {
            const failure = new Error('backup code required');
            userTwoFactorService.getBackupCodeForSetup.mockImplementation(
                () => {
                    throw failure;
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    setupDto
                )
            ).rejects.toBe(failure);
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
        });

        it('saves nothing when the backup code verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        ...setupDto,
                        backupCode: 'BACKUP1',
                    }
                )
            ).rejects.toBe(failure);
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            ).not.toHaveBeenCalled();
        });

        it('answers the password failure before any other step of setup', async () => {
            const failure = new UserPasswordAttemptMaxException();
            userAuthService.assertCurrentPassword.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    setupDto
                )
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.getBackupCodeForSetup
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
        });

        it('answers a password mismatch and saves nothing', async () => {
            userAuthService.assertCurrentPassword.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {}
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

            expect(userTwoFactorService.saveSetupInTx).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit of the backup code check', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        password: 'Current-pass1',
                        backupCode: 'BACKUP1',
                    }
                )
            ).rejects.toBe(limit);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.saveSetupConsumingBackupCodeInTx
            ).not.toHaveBeenCalled();
        });

        it('resets no password counter and opens no transaction when the backup code verification rejects', async () => {
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockRejectedValue(new Error('invalid'));

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { ...setupDto, backupCode: 'BACKUP1' }
                )
            ).rejects.toThrow('invalid');

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorInvalidException on a write conflict of the backup code path', async () => {
            const conflict = new Error('write conflict');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockResolvedValue({
                verified: {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    newBackupCodes: [],
                },
                totpStep: null,
            });
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
                    { ...setupDto, backupCode: 'BACKUP1' }
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    setupDto
                )
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps an unknown error of the backup code path in AppUnknownException', async () => {
            const cause = new Error('boom');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.check.mockResolvedValue({
                verified: {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    newBackupCodes: [],
                },
                totpStep: null,
            });
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    { ...setupDto, backupCode: 'BACKUP1' }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });

        it('wraps a write conflict of the no-backup-code path in AppUnknownException for the filter to map', async () => {
            const conflict = new Error('write conflict');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);
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
                    setupDto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: conflict,
            });
        });
    });
});
