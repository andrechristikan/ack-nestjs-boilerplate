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
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type {
    IUser,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
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
                UserEnableTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
            ],
        }).compile();
        useCase = module.get(UserEnableTwoFactorUseCase);
    });

    describe('execute', () => {
        const enableDto: UserTwoFactorEnableRequestDto = {
            code: '123456',
            password: 'Current-pass1',
        };

        it('asserts the password, counts the attempt, verifies the code against the pending secret, and enables with the passed context', async () => {
            const calls: string[] = [];
            userAuthService.assertCurrentPassword.mockImplementation(
                async () => {
                    calls.push('assertCurrentPassword');
                }
            );
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.assertAttemptCounted.mockImplementation(
                async () => {
                    calls.push('assertAttemptCounted');
                }
            );
            userTwoFactorService.verifySetupCode.mockImplementation(
                async () => {
                    calls.push('verifySetupCode');
                }
            );
            userTwoFactorService.enableTwoFactor.mockImplementation(
                async () => {
                    calls.push('enableTwoFactor');

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
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, user);
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledWith(
                user,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-marten',
                'pending-secret'
            );
            expect(calls).toEqual([
                'assertCurrentPassword',
                'assertAttemptCounted',
                'verifySetupCode',
                'enableTwoFactor',
            ]);
        });

        it('reads the actor id from the context actorUserId', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                enableDto
            );

            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'actor-other',
                'pending-secret'
            );
        });

        it('passes a null password for an absent one', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);

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
            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is rejected', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.verifySetupCode.mockRejectedValue(failure);

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
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
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

            expect(
                userTwoFactorService.assertAttemptCounted
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('answers the attempt limit before enable verifies the setup code', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(limit);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    enableDto
                )
            ).rejects.toBe(limit);
            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });
    });
});
