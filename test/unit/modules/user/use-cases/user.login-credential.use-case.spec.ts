import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
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
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import { SessionService } from '@modules/session/services/session.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginTwoFactorChallenge,
    IUserTwoFactorEnabled,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginCredentialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    let useCase: UserLoginCredentialUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens,
    };
    const device = {
        fingerprint: 'device-bramble',
        platform: EnumDevicePlatform.web,
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
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
    const verifyChallenge: IUserLoginTwoFactorChallenge = {
        isRequiredSetup: false,
        challengeToken: 'challenge-token',
        challengeExpiresInMs: 60000,
        backupCodesRemaining: 1,
    };
    const setupChallenge: IUserLoginTwoFactorChallenge = {
        isRequiredSetup: true,
        challengeToken: 'challenge-token',
        challengeExpiresInMs: 60000,
        backupCodesRemaining: 1,
        otpauthUrl: 'otpauth://totp/secret',
        secret: 'secret',
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
        jti: 'jti-bramble',
    };
    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        userAuthService.createTokenAndSession.mockResolvedValue(session);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginCredentialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: UserUtil, useValue: userUtil },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserLoginCredentialUseCase);
    });

    describe('execute', () => {
        const dto: UserLoginRequestDto = {
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plain-password',
            from: EnumUserLoginFrom.website,
            device,
        };
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };
        const lastWorkspace = {
            lastWorkspaceId: 'workspace-stale',
            lastWorkspaceChangedAt: new Date('2026-02-01T00:00:00.000Z'),
        };
        const unverifiedUser: IUser = { ...baseUser, isVerified: false };
        const emailNotVerifiedFields = {
            module: 'user',
            statusCode: EnumUserStatusCodeError.emailNotVerified,
            statusCodeKey:
                EnumUserStatusCodeError[
                    EnumUserStatusCodeError.emailNotVerified
                ],
            messagePath: 'user.error.emailNotVerified',
        };

        beforeEach(() => {
            userAuthService.countCredentialAttempt.mockResolvedValue(counted);
            userAuthService.verifyCredential.mockResolvedValue(true);
        });

        it('logs the user in through the service on a repeat device, counting with the passed context', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(userAuthService.countCredentialAttempt).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                dto.email
            );
            expect(
                userPasswordService.assertAttemptCounted
            ).toHaveBeenCalledWith(counted.isAttemptCounted);
            expect(userAuthService.verifyCredential).toHaveBeenCalledWith(
                counted,
                dto.password
            );
            expect(
                userAuthService.assertCredentialMatched
            ).toHaveBeenCalledWith(true);
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledAfter(
                userAuthService.createTokenAndSession
            );
            expect(outboxService.add).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('logs in on the device identity DeviceUtil shapes from the request device', async () => {
            const requestDevice: DeviceRequestDto = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            const fullDevice: IDeviceIdentity = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            deviceUtil.toIdentity.mockReturnValue(fullDevice);

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                device: requestDevice,
            });

            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(requestDevice);
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                baseUser,
                fullDevice,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
        });

        it('adds the failed-login entry from the passed context through OutboxService.add before the mismatch is answered', async () => {
            const failure = new Error('not match');
            userAuthService.verifyCredential.mockResolvedValue(false);
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.add).toHaveBeenCalledWith(entryEffect);
            expect(outboxService.add).toHaveBeenCalledBefore(
                userAuthService.assertCredentialMatched
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('answers the attempt limit of a spent count and verifies nothing', async () => {
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                isAttemptCounted: false,
            });
            const failure = new UserPasswordAttemptMaxException();
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(userAuthService.verifyCredential).not.toHaveBeenCalled();
            expect(outboxService.add).not.toHaveBeenCalled();
        });

        it('sends a verification email with its entry on one tx and rejects with the unverified error when resendable', async () => {
            const callOrder: string[] = [];
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userAuthService.verifyCredential.mockImplementation(async () => {
                callOrder.push('verifyCredential');

                return true;
            });
            userVerificationService.isEmailResendable.mockImplementation(
                async () => {
                    callOrder.push('isEmailResendable');

                    return true;
                }
            );
            userVerificationService.sendEmailInTx.mockImplementation(
                async () => {
                    callOrder.push('sendEmailInTx');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            userAuthService.assertVerified.mockImplementation(() => {
                callOrder.push('assertVerified');

                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(userUtil.isUnverified).toHaveBeenCalledWith(unverifiedUser);
            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                unverifiedUser
            );
            expect(callOrder).toEqual([
                'verifyCredential',
                'isEmailResendable',
                'sendEmailInTx',
                'addInTx',
                'assertVerified',
            ]);
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTwoFactorChallenge
            ).not.toHaveBeenCalled();
        });

        it('rejects with the unverified error and sends nothing inside the resend window', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userVerificationService.isEmailResendable.mockResolvedValue(false);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                unverifiedUser
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('sends the verification email before the expiry check for an unverified user with an expired password', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userVerificationService.isEmailResendable.mockResolvedValue(true);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });
            userAuthService.assertPasswordNotExpired.mockImplementation(() => {
                throw new UserPasswordExpiredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(
                userAuthService.assertPasswordNotExpired
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('skips the send for a verified user', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(userUtil.isUnverified).toHaveBeenCalledWith(baseUser);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                baseUser
            );
            expect(
                userAuthService.assertPasswordNotExpired
            ).toHaveBeenCalledWith(baseUser);
            expect(
                userAuthService.assertPasswordNotExpired
            ).toHaveBeenCalledBefore(userAuthService.createTokenAndSession);
        });

        it('rejects a wrong password of an unverified user with the credential error and sends nothing', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userAuthService.verifyCredential.mockResolvedValue(false);
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw new UserCredentialInvalidException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });

            expect(outboxService.add).toHaveBeenCalledWith(entryEffect);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects an unverified two-factor user with the unverified error before any challenge or session', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...twoFactorUser, isVerified: false },
            });
            userVerificationService.isEmailResendable.mockResolvedValue(false);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(
                userAuthService.createTwoFactorChallenge
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('creates a challenge with the passed context and issues nothing for an already set-up two-factor user', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                verifyChallenge
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: verifyChallenge,
                },
            });

            expect(
                userAuthService.createTwoFactorChallenge
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('returns the resolved lastWorkspaceId on the token outcome', async () => {
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });
            workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(
                'workspace-resolved'
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    ...tokenOutcome,
                    lastWorkspaceId: 'workspace-resolved',
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });

        it('returns the resolved lastWorkspaceId on the two-factor outcome', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...twoFactorUser, ...lastWorkspace },
            });
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                setupChallenge
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: setupChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(userAuthService.createTwoFactorChallenge);
        });
    });

    describe('startSession', () => {
        const startArgs = [
            requestContext,
            apiKeyContext,
            baseUser,
            deviceIdentity,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential,
            loginAt,
        ] as const;

        it('starts the session through createTokenAndSession with the passed context', async () => {
            await useCase['startSession'](...startArgs);

            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
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

        it('returns the session tokens', async () => {
            await expect(useCase['startSession'](...startArgs)).resolves.toBe(
                tokens
            );
        });

        it('sets no login when createTokenAndSession rejects', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
        });

        it('rejects with the login cache failure from setLoginOrRevoke', async () => {
            const failure = new RedisUnavailableException();
            sessionService.setLoginOrRevoke.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );
        });
    });
});
