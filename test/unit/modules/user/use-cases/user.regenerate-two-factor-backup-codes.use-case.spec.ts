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
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type {
    IUser,
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
                UserRegenerateTwoFactorBackupCodesUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
            ],
        }).compile();
        useCase = module.get(UserRegenerateTwoFactorBackupCodesUseCase);
    });

    describe('execute', () => {
        it('gates, counts the attempt, verifies the code, and regenerates with the passed context', async () => {
            const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
                code: '123456',
            };
            userTwoFactorService.regenerateTwoFactorBackupCodes.mockResolvedValue(
                ['CODE1', 'CODE2']
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
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, user);
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledBefore(userTwoFactorService.verify);
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, authContext);
        });

        it('verifies nothing when two-factor is not enabled', async () => {
            userTwoFactorService.assertEnabled.mockImplementation(() => {
                throw new Error('not enabled');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        code: '1',
                    }
                )
            ).rejects.toThrow('not enabled');
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the code is rejected', async () => {
            userTwoFactorService.verify.mockRejectedValue(new Error('invalid'));

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {
                        code: '0',
                    }
                )
            ).rejects.toThrow('invalid');
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
        });

        it('answers the attempt limit before regenerate verifies the code', async () => {
            const limit = new AuthTwoFactorAttemptMaxException();
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(limit);

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
            ).rejects.toBe(limit);
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
        });
    });
});
