import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserRegenerateTwoFactorBackupCodesUseCase } from '@modules/user/use-cases/user.regenerate-two-factor-backup-codes.use-case';

describe('UserRegenerateTwoFactorBackupCodesUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userDisableTwoFactor,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const twoFactorAttempt: IUserTwoFactorAttempt = {
        isAttemptCounted: true,
        lockoutStages: [],
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        userTwoFactorService.countAttempt.mockResolvedValue(twoFactorAttempt);
        userTwoFactorService.verify.mockResolvedValue(verified);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRegenerateTwoFactorBackupCodesUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserRegenerateTwoFactorBackupCodesUseCase);
    });

    describe('execute', () => {
        it('gates, verifies the code, regenerates, stages the row, and wraps the fresh backup codes', async () => {
            const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
                code: '123456',
            };
            const calls: string[] = [];
            userTwoFactorService.regenerateTwoFactorBackupCodes.mockImplementation(
                async () => {
                    calls.push('regenerate');

                    return ['CODE1', 'CODE2'];
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            await expect(useCase.execute(user, dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1', 'CODE2'] },
            });
            expect(userTwoFactorService.assertEnabled).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verify
            );
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
                backupCode: null,
            });
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith('user-marten');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            });
            expect(calls).toEqual(['stage', 'regenerate', 'stage']);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog]
            );
        });

        it('verifies nothing when two-factor is not enabled', async () => {
            userTwoFactorService.assertEnabled.mockImplementation(() => {
                throw new Error('not enabled');
            });

            await expect(useCase.execute(user, { code: '1' })).rejects.toThrow(
                'not enabled'
            );
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
        });

        it('regenerates nothing when the code is rejected', async () => {
            userTwoFactorService.verify.mockRejectedValue(new Error('invalid'));

            await expect(useCase.execute(user, { code: '0' })).rejects.toThrow(
                'invalid'
            );
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });
    });

    describe('assertTwoFactorAttemptCounted', () => {
        const limit = new AuthTwoFactorAttemptMaxException();

        const lockoutLogs = [activityLog, activityLog];

        const lockoutStages = [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-marten',
                createdBy: 'user-marten',
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-marten',
                createdBy: 'user-marten',
            },
        ];

        const spent: IUserTwoFactorAttempt = {
            isAttemptCounted: false,
            lockoutStages,
        };

        beforeEach(() => {
            userTwoFactorService.countAttempt.mockResolvedValue(spent);
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                throw limit;
            });
        });

        it('stages the lockout rows and answers the attempt limit before regenerate verifies the code', async () => {
            await expect(
                useCase.execute(user, {
                    code: '123456',
                })
            ).rejects.toBe(limit);
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith(lockoutLogs);
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.regenerateTwoFactorBackupCodes
            ).not.toHaveBeenCalled();
        });
    });
});
