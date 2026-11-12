import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';

describe('UserLoginSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const context = buildRequestContext(null);
    let useCase: UserLoginSetupTwoFactorUseCase;

    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
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
            id: 'role-bramble',
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
        twoFactor: null,
    };
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
            ],
        }).compile();
        useCase = module.get(UserLoginSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto = { challengeToken: 'challenge-token', code: '123456' };

        beforeEach(() => {
            authTwoFactorService.getChallenge.mockResolvedValue(challenge);
            userTwoFactorService.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorService.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);
        });

        it('counts the attempt with the passed context, verifies the setup code against the pending secret, and enables two-factor', async () => {
            await expect(useCase.execute(dto, context)).resolves.toEqual({
                data: { backupCodes: ['backup-one'] },
            });

            expect(
                userTwoFactorService.getOneForLoginSetup
            ).toHaveBeenCalledWith('user-bramble');
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(twoFactorUser, context);
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledWith(
                twoFactorUser,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledWith(
                'user-bramble',
                'pending-secret',
                context
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledBefore(userTwoFactorService.verifySetupCode);
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledBefore(
                userTwoFactorService.enableTwoFactor
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(useCase.execute(dto, context)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit of a spent count and verifies nothing', async () => {
            userTwoFactorService.assertAttemptCounted.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(useCase.execute(dto, context)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is wrong', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.verifySetupCode.mockRejectedValue(failure);

            await expect(useCase.execute(dto, context)).rejects.toBe(failure);

            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });
    });
});
