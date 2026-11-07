import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type { IAuthTwoFactorChallengeCache } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorAttempt,
} from '@modules/user/interfaces/user.interface';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';

describe('UserLoginSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    let useCase: UserLoginSetupTwoFactorUseCase;

    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };
    const twoFactorSpentAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: false,
        lockoutStages: [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            },
        ],
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
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

        activityLogService.prepare.mockReturnValue(activityLog);

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
                { provide: ActivityLogService, useValue: activityLogService },
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
            userTwoFactorService.countAttempt.mockResolvedValue(
                twoFactorAttempt
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);
        });

        it('verifies the setup code against the pending secret, enables two-factor, and stages the row', async () => {
            await expect(useCase.execute(dto)).resolves.toEqual({
                data: { backupCodes: ['backup-one'] },
            });

            expect(
                userTwoFactorService.getOneForLoginSetup
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledWith(
                twoFactorUser,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledWith(
                'user-bramble',
                'pending-secret'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog]
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userTwoFactorService.assertAttemptCounted
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verifySetupCode
            );
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledBefore(
                userTwoFactorService.enableTwoFactor
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });

        it('stages both lockout rows after the spent count before the two-factor attempt limit is answered', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                callOrder.push('countAttempt');

                return twoFactorSpentAttempt;
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw new AuthTwoFactorAttemptMaxException();
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([activityLog, activityLog]);
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(callOrder).toEqual([
                'countAttempt',
                'stagePrepared',
                'assert',
            ]);
            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is wrong', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.verifySetupCode.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });
    });
});
