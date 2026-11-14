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
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();

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
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userTwoFactorService.verify.mockResolvedValue(verified);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
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
            expect(
                userTwoFactorService.assertAttemptCounted
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).toHaveBeenCalledWith(user);
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-marten',
                'encrypted-pending'
            );
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
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

            expect(userTwoFactorService.saveSetup).toHaveBeenCalledWith(
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

        it('counts the attempt, verifies the backup code, then saves the pending secret consuming it when two-factor is enabled', async () => {
            const dto: UserTwoFactorSetupRequestDto = {
                ...setupDto,
                backupCode: 'BACKUP1',
            };
            const backupVerified: IUserTwoFactorVerifyResult = {
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: [],
            };
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.verify.mockResolvedValue(backupVerified);

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
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, user);
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledBefore(userTwoFactorService.verify);
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: 'BACKUP1',
            });
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                'encrypted-pending',
                backupVerified
            );
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
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
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });

        it('saves nothing when the backup code verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.verify.mockRejectedValue(failure);

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
                userTwoFactorService.saveSetupConsumingBackupCode
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
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
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

            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit before the backup code of a setup is verified', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(limit);

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

            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
        });
    });
});
