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
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserTwoFactorAttempt,
    IUserTwoFactorSetup,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserSetupTwoFactorUseCase } from '@modules/user/use-cases/user.setup-two-factor.use-case';

describe('UserSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
                UserSetupTwoFactorUseCase,
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

        it('saves the pending secret and stages the row when two-factor is not enabled', async () => {
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await expect(useCase.execute(user, setupDto)).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorService.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, null);
            expect(userTwoFactorService.countAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).toHaveBeenCalledWith(user);
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledWith(
                'user-marten',
                'encrypted-pending'
            );
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledBefore(
                activityLogService.stagePrepared
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('verifies the backup code, then saves the pending secret consuming it when two-factor is enabled', async () => {
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

            await expect(useCase.execute(user, dto)).resolves.toEqual({
                data: setup,
            });

            expect(
                userTwoFactorService.getBackupCodeForSetup
            ).toHaveBeenCalledWith(user, 'BACKUP1');
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                user
            );
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorService.verify
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userTwoFactorService.assertAttemptCounted
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode: 'BACKUP1',
            });
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).toHaveBeenCalledWith(user, 'encrypted-pending', backupVerified);
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('generates and saves nothing when the backup code gate rejects', async () => {
            const failure = new Error('backup code required');
            userTwoFactorService.getBackupCodeForSetup.mockImplementation(
                () => {
                    throw failure;
                }
            );

            await expect(useCase.execute(user, setupDto)).rejects.toBe(failure);
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('saves nothing when the backup code verification rejects', async () => {
            const failure = new Error('invalid');
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(
                useCase.execute(user, {
                    ...setupDto,
                    backupCode: 'BACKUP1',
                })
            ).rejects.toBe(failure);
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('skips the password check for a passwordless account', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await useCase.execute(user, {});

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(
                userAuthService.assertPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledTimes(1);
        });

        it('counts an attempt and throws UserPasswordNotMatchException when the password is absent', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockRejectedValue(
                new UserPasswordNotMatchException()
            );
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await expect(useCase.execute(user, {})).rejects.toMatchObject({
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
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockRejectedValue(failure);
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(null);

            await expect(useCase.execute(user, setupDto)).rejects.toBe(failure);

            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordMatched', () => {
        const lockoutLogs = [activityLog, activityLog];

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

        it('counts the attempt and verifies the credential before any other step of setup', async () => {
            const calls: string[] = [];
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countPasswordAttempt');

                    return passwordAttempt;
                }
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assertPasswordAttempt');
                }
            );
            userTwoFactorService.getBackupCodeForSetup.mockImplementation(
                () => {
                    calls.push('getBackupCodeForSetup');

                    return null;
                }
            );

            await useCase.execute(user, { password: 'Current-pass1' });

            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(user);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'Current-pass1'
            );
            expect(calls).toEqual([
                'countPasswordAttempt',
                'assertPasswordAttempt',
                'getBackupCodeForSetup',
            ]);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userAuthService.assertPasswordAttempt
            );
        });

        it('stages both lockout rows after the spent attempt is counted and answers the attempt limit', async () => {
            const limit = new UserPasswordAttemptMaxException();
            const calls: string[] = [];
            const spent = {
                ...passwordAttempt,
                isAttemptCounted: false,
                lockoutStages: [
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
                ],
            };
            userPasswordService.countPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('countPasswordAttempt');

                    return spent;
                }
            );
            userAuthService.assertPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('assert');

                    throw limit;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stagePrepared');
            });

            await expect(
                useCase.execute(user, { password: 'Current-pass1' })
            ).rejects.toBe(limit);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-marten',
                createdBy: 'user-marten',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith(
                lockoutLogs
            );
            expect(calls).toEqual([
                'countPasswordAttempt',
                'stagePrepared',
                'assert',
            ]);
            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                spent,
                'Current-pass1'
            );
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });

        it('saves nothing when the password does not match', async () => {
            const mismatch = new UserPasswordNotMatchException();
            userPasswordService.countPasswordAttempt.mockResolvedValue(
                passwordAttempt
            );
            userAuthService.assertPasswordAttempt.mockRejectedValue(mismatch);

            await expect(
                useCase.execute(user, { password: 'wrong' })
            ).rejects.toBe(mismatch);

            expect(userAuthService.assertPasswordAttempt).toHaveBeenCalledWith(
                passwordAttempt,
                'wrong'
            );
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
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

        it('stages both lockout rows after the spent count and answers the attempt limit before the backup code of a setup is verified', async () => {
            const calls: string[] = [];
            userTwoFactorService.getBackupCodeForSetup.mockReturnValue(
                'BACKUP1'
            );
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                calls.push('countAttempt');

                return spent;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stagePrepared');
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                calls.push('assertAttemptCounted');

                throw limit;
            });

            await expect(
                useCase.execute(user, {
                    password: 'Current-pass1',
                    backupCode: 'BACKUP1',
                })
            ).rejects.toBe(limit);

            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                user
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                lockoutStages[0]
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                lockoutStages[1]
            );
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith(lockoutLogs);
            expect(calls).toEqual([
                'countAttempt',
                'stagePrepared',
                'assertAttemptCounted',
            ]);
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.saveSetupConsumingBackupCode
            ).not.toHaveBeenCalled();
        });
    });
});
