import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
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
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationVerificationEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';

describe('UserLoginCredentialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginCredentialUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-bramble',
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
        requestLog,
        isNewDevice: true,
        revokeStages: [],
    };
    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        activityLogService.prepare.mockReturnValue(activityLog);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        notificationService.getRecipient.mockResolvedValue(recipient);
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
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: DeviceUtil, useValue: deviceUtil },
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
            lockoutStages: [],
        };
        const lastWorkspace = {
            lastWorkspaceId: 'workspace-stale',
            lastWorkspaceChangedAt: new Date('2026-02-01T00:00:00.000Z'),
        };
        const unverifiedUser: IUser = { ...baseUser, isVerified: false };
        const emailVerification: IUserVerificationEmailCreate = {
            type: 'email',
            reference: 'VRF-bramble',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            expiredInMinutes: 15,
            resendInMinutes: 5,
            token: 'random-token',
            hashedToken: 'hashed-token',
            link: 'https://example.com/verify?token=random-token',
        };
        const emailPayload: INotificationVerificationEmailPayload = {
            link: 'https://example.com/verify?token=random-token',
            expiredAt: '2026-03-05T00:00:00.000Z',
            expiredInMinutes: 15,
            reference: 'VRF-bramble',
        };
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

        it('logs the user in through the service on a repeat device and stages after it', async () => {
            const callOrder: string[] = [];
            userAuthService.createTokenAndSession.mockImplementation(
                async () => {
                    callOrder.push('createTokenAndSession');

                    return {
                        ...session,
                        isNewDevice: false,
                    };
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(userAuthService.countCredentialAttempt).toHaveBeenCalledWith(
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
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userPasswordService.assertAttemptCounted
            );
            expect(callOrder).toEqual([
                'stagePrepared',
                'createTokenAndSession',
                'stagePrepared',
            ]);
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

            await useCase.execute({ ...dto, device: requestDevice });

            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(requestDevice);
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                baseUser,
                fullDevice,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
        });

        it('stages the login row once the tokens are issued', async () => {
            await useCase.execute(dto);

            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(2);
        });

        it('stages the failed-login row before the mismatch is answered', async () => {
            const failure = new Error('not match');
            userAuthService.verifyCredential.mockResolvedValue(false);
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginFailed,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userAuthService.assertCredentialMatched
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('stages both lockout rows after the spent count before the attempt limit is answered', async () => {
            const spent = {
                ...counted,
                isAttemptCounted: false,
                lockoutStages: [
                    {
                        action: EnumActivityLogAction.userRevokeAllSessions,
                        userId: 'user-bramble',
                        createdBy: 'user-bramble',
                    },
                    {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        userId: 'user-bramble',
                        createdBy: 'user-bramble',
                    },
                ],
            };
            const callOrder: string[] = [];
            userAuthService.countCredentialAttempt.mockImplementation(
                async () => {
                    callOrder.push('countCredentialAttempt');

                    return spent;
                }
            );
            const failure = new Error('attempt max');
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw failure;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(activityLogService.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(callOrder).toEqual([
                'countCredentialAttempt',
                'stagePrepared',
                'assert',
            ]);
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(userAuthService.verifyCredential).not.toHaveBeenCalled();
        });

        it('sends a verification email and rejects with the unverified error when resendable', async () => {
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
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('getRecipient');

                return recipient;
            });
            userVerificationService.createEmail.mockImplementation(async () => {
                callOrder.push('createEmail');

                return emailVerification;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            userVerificationUtil.mapEmailPayload.mockReturnValue(emailPayload);
            notificationQueue.sendVerificationEmail.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationEmail');
                }
            );
            userAuthService.assertVerified.mockImplementation(() => {
                callOrder.push('assertVerified');

                throw new UserEmailNotVerifiedException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject(
                emailNotVerifiedFields
            );

            expect(userUtil.isUnverified).toHaveBeenCalledWith(unverifiedUser);
            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                unverifiedUser,
                EnumNotificationKind.verificationEmail
            );
            expect(userVerificationService.createEmail).toHaveBeenCalledWith(
                'user-bramble',
                'bramble@example.com'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenLastCalledWith([
                activityLog,
            ]);
            expect(userVerificationUtil.mapEmailPayload).toHaveBeenCalledWith(
                emailVerification
            );
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(recipient, emailPayload);
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                unverifiedUser
            );
            expect(callOrder).toEqual([
                'stagePrepared',
                'verifyCredential',
                'isEmailResendable',
                'getRecipient',
                'createEmail',
                'stagePrepared',
                'sendVerificationEmail',
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

            await expect(useCase.execute(dto)).rejects.toMatchObject(
                emailNotVerifiedFields
            );

            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(notificationService.getRecipient).not.toHaveBeenCalled();
            expect(userVerificationService.createEmail).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
            expect(
                notificationQueue.sendVerificationEmail
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
            userVerificationService.createEmail.mockResolvedValue(
                emailVerification
            );
            userVerificationUtil.mapEmailPayload.mockReturnValue(emailPayload);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });
            userAuthService.assertPasswordNotExpired.mockImplementation(() => {
                throw new UserPasswordExpiredException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject(
                emailNotVerifiedFields
            );

            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(recipient, emailPayload);
            expect(
                userAuthService.assertPasswordNotExpired
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('skips the send for a verified user', async () => {
            await expect(useCase.execute(dto)).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(userUtil.isUnverified).toHaveBeenCalledWith(baseUser);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
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

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginFailed,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('rejects a spent budget of an unverified user with the attempt limit and runs neither the check nor the send', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            const lockoutStages = [
                {
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                },
                {
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                },
            ];
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
                isAttemptCounted: false,
                lockoutStages,
            });
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                throw new UserPasswordAttemptMaxException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });

            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(userAuthService.verifyCredential).not.toHaveBeenCalled();
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationEmail
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

            await expect(useCase.execute(dto)).rejects.toMatchObject(
                emailNotVerifiedFields
            );

            expect(
                userAuthService.createTwoFactorChallenge
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                verifyChallenge
            );

            await expect(useCase.execute(dto)).resolves.toEqual({
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
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('stages the setup row when the challenge requires setup', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                setupChallenge
            );

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: setupChallenge,
                },
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(2);
        });

        it('stages no setup row when the challenge fails', async () => {
            const failure = new Error('challenge failed');
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            userAuthService.createTwoFactorChallenge.mockRejectedValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('returns the resolved lastWorkspaceId on the token outcome', async () => {
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });
            workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(
                'workspace-resolved'
            );

            await expect(useCase.execute(dto)).resolves.toEqual({
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
                verifyChallenge
            );

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: verifyChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(userAuthService.createTwoFactorChallenge);
        });

        it('returns the resolved lastWorkspaceId on the two-factor setup outcome', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...twoFactorUser, ...lastWorkspace },
            });
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                setupChallenge
            );

            await expect(useCase.execute(dto)).resolves.toEqual({
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

        it('reads the recipient before createTokenAndSession', async () => {
            await useCase['startSession'](...startArgs);

            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin
            );
            expect(notificationService.getRecipient).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSession
            );
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

        it('sends the new-device notification only for a new device', async () => {
            await useCase['startSession'](...startArgs);

            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-03-05T00:00:00.000Z',
                },
                'session-bramble'
            );

            notificationQueue.sendNewDeviceLogin.mockClear();
            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                isNewDevice: false,
            });

            await useCase['startSession'](...startArgs);

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
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
            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('fails before the service call when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
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
