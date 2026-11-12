import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import type {
    IActivityLogStageInput,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorEnabled,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';

describe('UserLoginVerifyTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginVerifyTwoFactorUseCase;
    let setupUseCase: UserLoginSetupTwoFactorUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
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
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
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
    const twoFactorUser: IUserTwoFactorEnabled = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
        jti: 'jti-bramble',
        revokeStages: [],
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.prepare.mockReturnValue(activityLog);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        userAuthService.createTokenAndSession.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginVerifyTwoFactorUseCase,
                UserLoginSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: UserUtil, useValue: userUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserLoginVerifyTwoFactorUseCase);
        setupUseCase = module.get(UserLoginSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        beforeEach(() => {
            authTwoFactorService.getChallenge.mockResolvedValue(challenge);
            authTwoFactorService.consumeChallenge.mockResolvedValue(challenge);
            userTwoFactorService.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorService.countAttempt.mockResolvedValue(
                twoFactorAttempt
            );
            userTwoFactorService.verify.mockResolvedValue(verified);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('verifies the challenge user, claims the challenge, records the verification, issues the session, and stages both rows', async () => {
            const callOrder: string[] = [];
            userTwoFactorService.countAttempt.mockImplementation(async () => {
                callOrder.push('countAttempt');

                return twoFactorAttempt;
            });
            userTwoFactorService.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assertAttemptCounted');
            });
            userTwoFactorService.verify.mockImplementation(async () => {
                callOrder.push('verify');

                return verified;
            });
            authTwoFactorService.consumeChallenge.mockImplementation(
                async () => {
                    callOrder.push('consumeChallenge');

                    return challenge;
                }
            );
            userTwoFactorService.recordVerification.mockImplementation(
                async () => {
                    callOrder.push('recordVerification');
                }
            );
            userAuthService.createTokenAndSession.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSession');

                    return session;
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorService.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorService.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(
                userTwoFactorService.recordVerification
            ).toHaveBeenCalledWith(twoFactorUser, verified);
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(
                userTwoFactorService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(callOrder).toEqual([
                'countAttempt',
                'stagePrepared',
                'assertAttemptCounted',
                'verify',
                'consumeChallenge',
                'recordVerification',
                'stagePrepared',
                'createTokenAndSession',
                'stagePrepared',
            ]);
        });

        it('claims the challenge once and issues tokens after the setup step left it in place', async () => {
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

            await setupUseCase.execute({
                challengeToken: 'challenge-token',
                code: '123456',
            });

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorService.getChallenge).toHaveBeenCalledTimes(2);
            expect(authTwoFactorService.consumeChallenge).toHaveBeenCalledTimes(
                1
            );
        });

        it('forwards the backup code', async () => {
            await useCase.execute({
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(userTwoFactorService.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
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
                userTwoFactorService.getOneForLoginVerify
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
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(userTwoFactorService.verify).not.toHaveBeenCalled();
            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('issues nothing and stages no row when the verification fails', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.verify.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerification
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('leaves the challenge claimable when the code is wrong', async () => {
            userTwoFactorService.verify.mockRejectedValue(
                new Error('invalid code')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('invalid code');

            expect(
                authTwoFactorService.consumeChallenge
            ).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim fails', async () => {
            const failure = new Error('redis down');
            authTwoFactorService.consumeChallenge.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(
                userTwoFactorService.recordVerification
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('stages no login row when the session start fails', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);
            const callOrder: string[] = [];
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(callOrder).toEqual(['stagePrepared', 'stagePrepared']);
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
        });
    });

    describe('startSession', () => {
        const thistleStage: IActivityLogStageInput<EnumActivityLogAction> = {
            action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
            userId: 'user-thistle',
            createdBy: 'user-bramble',
            metadata: { actorUserId: 'user-bramble', sessionCount: 2 },
        };
        const cloverStage: IActivityLogStageInput<EnumActivityLogAction> = {
            ...thistleStage,
            userId: 'user-clover',
        };
        const startArgs = [
            baseUser,
            deviceIdentity,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential,
            loginAt,
        ] as const;

        it('starts the session through createTokenAndSession', async () => {
            await useCase['startSession'](...startArgs);

            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );
        });

        it('sets the login after the service call', async () => {
            await useCase['startSession'](...startArgs);

            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledAfter(
                userAuthService.createTokenAndSession
            );
        });

        it('stages the revoke rows after setting the login only when revokeStages is not empty', async () => {
            const callOrder: string[] = [];
            await useCase['startSession'](...startArgs);

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                revokeStages: [thistleStage, cloverStage],
            });
            sessionService.setLoginOrRevoke.mockImplementation(async () => {
                callOrder.push('setLoginOrRevoke');
            });
            activityLogService.prepare
                .mockReturnValueOnce({ ...activityLog, userId: 'user-thistle' })
                .mockReturnValueOnce({ ...activityLog, userId: 'user-clover' });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await useCase['startSession'](...startArgs);

            expect(activityLogService.prepare).toHaveBeenCalledWith(
                thistleStage
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                cloverStage
            );
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([
                { ...activityLog, userId: 'user-thistle' },
                { ...activityLog, userId: 'user-clover' },
            ]);
            expect(callOrder).toEqual(['setLoginOrRevoke', 'stagePrepared']);
        });

        it('returns the session tokens', async () => {
            await expect(useCase['startSession'](...startArgs)).resolves.toBe(
                tokens
            );
        });

        it('enqueues nothing when createTokenAndSession rejects', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
