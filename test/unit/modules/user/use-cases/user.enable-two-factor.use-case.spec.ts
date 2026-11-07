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
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserTwoFactorAttempt,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserEnableTwoFactorUseCase } from '@modules/user/use-cases/user.enable-two-factor.use-case';

describe('UserEnableTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userDisableTwoFactor,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const passwordAttempt: IUserCredentialAttempt = {
        user,
        hashedPassword: 'hashed-password',
        isAttemptCounted: true,
        lockoutStages: [],
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
        userPasswordService.countPasswordAttempt.mockResolvedValue(null);
        userTwoFactorService.verify.mockResolvedValue(verified);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserEnableTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: UserPasswordService,
                    useValue: userPasswordService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserEnableTwoFactorUseCase);
    });

    describe('execute', () => {
        const enableDto: UserTwoFactorEnableRequestDto = {
            code: '123456',
            password: 'Current-pass1',
        };

        it('verifies the code against the pending secret, enables, stages the row, and wraps the backup codes', async () => {
            const dto = enableDto;
            const calls: string[] = [];
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
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
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stagePrepared');
            });

            await expect(useCase.execute(user, dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1'] },
            });

            expect(userTwoFactorService.getPendingSecret).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.verifySetupCode).toHaveBeenCalledWith(
                user,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledWith(
                'user-marten',
                'pending-secret'
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verifySetupCode
            );
            expect(calls).toEqual([
                'stagePrepared',
                'verifySetupCode',
                'enableTwoFactor',
                'stagePrepared',
            ]);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                2,
                [activityLog]
            );
        });

        it('verifies nothing when no pending secret exists', async () => {
            userTwoFactorService.getPendingSecret.mockImplementation(() => {
                throw new Error('no pending');
            });

            await expect(useCase.execute(user, enableDto)).rejects.toThrow(
                'no pending'
            );
            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
        });

        it('enables nothing and stages nothing when the setup code is rejected', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.verifySetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(user, { ...enableDto, code: '000000' })
            ).rejects.toBe(failure);
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('skips the password check for a passwordless account', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);

            await useCase.execute(user, { code: '123456' });

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).toHaveBeenCalledTimes(
                1
            );
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(
                useCase.execute(user, { code: '123456' })
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
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledTimes(1);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                null
            );
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(useCase.execute(user, enableDto)).rejects.toBe(
                failure
            );

            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordMatched', () => {
        beforeEach(() => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );
            userTwoFactorService.enableTwoFactor.mockResolvedValue(['CODE1']);
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-pending',
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            });
        });

        it('counts and verifies the credential before enable verifies the setup code', async () => {
            const calls: string[] = [];
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assertPasswordAttempt');
                }
            );
            userTwoFactorService.verifySetupCode.mockImplementation(
                async () => {
                    calls.push('verifySetupCode');
                }
            );

            await useCase.execute(user, {
                code: '123456',
                password: 'Current-pass1',
            });

            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'Current-pass1'
            );
            expect(calls).toEqual(['assertPasswordAttempt', 'verifySetupCode']);
        });

        it('stages the lockout rows before the credential is verified', async () => {
            const lockoutStages = [
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-marten',
                    createdBy: 'user-marten',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-marten',
                    createdBy: 'user-marten',
                },
            ];
            userPasswordService.countPasswordAttempt.mockResolvedValue({
                ...passwordAttempt,
                lockoutStages,
            });

            await useCase.execute(user, {
                code: '123456',
                password: 'Current-pass1',
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith(
                lockoutStages[0]
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                lockoutStages[1]
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
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

        it('stages the lockout rows and answers the attempt limit before enable verifies the setup code', async () => {
            userTwoFactorService.getPendingSecret.mockReturnValue(
                'pending-secret'
            );

            await expect(
                useCase.execute(user, {
                    code: '123456',
                    password: 'Current-pass1',
                })
            ).rejects.toBe(limit);
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith(lockoutLogs);
            expect(userTwoFactorService.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorService.enableTwoFactor).not.toHaveBeenCalled();
        });
    });
});
