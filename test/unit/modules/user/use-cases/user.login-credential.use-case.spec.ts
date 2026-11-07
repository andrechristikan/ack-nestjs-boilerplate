import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
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
import type {
    DeviceOwnership,
    TwoFactor,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogMetadata,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { DeviceService } from '@modules/device/services/device.service';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
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
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
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
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';

describe('UserLoginCredentialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
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
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginCredentialUseCase;

    const tx = {} as IDatabaseTransactionClient;
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
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const ownership: DeviceOwnership = {
        id: 'device-ownership-bramble',
        deviceId: 'device-bramble',
        userId: 'user-bramble',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: 'token-bramble',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-bramble',
            fingerprint: 'device-bramble',
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: ownership,
        isNewDevice: true,
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionService.getRequestLog.mockReturnValue(requestLog);
        activityLogService.prepare.mockReturnValue(activityLog);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        userUtil.requiresTwoFactorSetup.mockReturnValue(false);
        notificationService.getRecipient.mockResolvedValue(recipient);
        deviceService.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue([]);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        authUtil.createLoginIdentifiers.mockReturnValue({
            sessionId: 'session-bramble',
            jti: 'jti-bramble',
        });
        authJwtService.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtService,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        userService.createManyInTx.mockResolvedValue([committedUser]);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginCredentialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserService, useValue: userService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
                { provide: AuthUtil, useValue: authUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: DatabaseService, useValue: databaseService },
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

        it('logs the user in on one transaction and purges the session cache entries of a repeat device after the commit', async () => {
            const callOrder: string[] = [];
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
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
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                now
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                now,
                requestLog
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(activityLogService.stagePrepared).toHaveBeenNthCalledWith(
                1,
                []
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledBefore(
                userPasswordService.assertAttemptCounted
            );
            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'stagePrepared',
                'committed',
                'purgeLogins',
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
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                fullDevice,
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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

            expect(userUtil.buildPasswordLockoutStages).not.toHaveBeenCalled();
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(authTwoFactorService.createChallenge).not.toHaveBeenCalled();
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
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

            expect(authTwoFactorService.createChallenge).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionService.createInTx).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            authTwoFactorService.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: false,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                    },
                },
            });

            expect(authTwoFactorService.createChallenge).toHaveBeenCalledWith({
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([]);
        });

        it('creates a challenge and a fresh setup, stores the secret, and stages the setup row when two-factor requires setup', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            authTwoFactorService.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                        otpauthUrl: 'otpauth://totp/secret',
                        secret: 'secret',
                    },
                },
            });

            expect(userTwoFactorService.setup).toHaveBeenCalledWith(
                requiresSetup
            );
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledWith(
                'user-bramble',
                'encrypted-secret'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(2);
        });

        it('writes no secret when the challenge fails during setup', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            const failure = new Error('challenge failed');
            authTwoFactorService.createChallenge.mockRejectedValue(failure);
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(useCase.execute(dto)).rejects.toBe(failure);

            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
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
            authTwoFactorService.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: {
                        isRequiredSetup: false,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                    },
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });

        it('returns the resolved lastWorkspaceId on the two-factor setup outcome', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            userAuthService.countCredentialAttempt.mockResolvedValue({
                ...counted,
                user: {
                    ...twoFactorUser,
                    ...lastWorkspace,
                    twoFactor: {
                        ...twoFactor,
                        enabled: true,
                        requiredSetup: true,
                    },
                },
            });
            authTwoFactorService.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                        otpauthUrl: 'otpauth://totp/secret',
                        secret: 'secret',
                    },
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });
    });

    describe('createTokenAndSession', () => {
        const otherOwnershipIds = [
            'device-ownership-thistle',
            'device-ownership-clover',
        ];
        const affected: ISessionPurgeLoginsPayload[] = [
            {
                userId: 'user-thistle',
                sessions: [
                    { id: 'session-thistle-1' },
                    { id: 'session-thistle-2' },
                ],
            },
            { userId: 'user-clover', sessions: [{ id: 'session-clover' }] },
        ];
        const revokeMetadata: IActivityLogMetadata = {
            actorUserId: 'user-bramble',
            sessionCount: 2,
        };
        const thistleLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
            metadata: revokeMetadata,
            userId: 'user-thistle',
            createdBy: 'user-bramble',
            workspaceId: null,
        };
        const cloverLog: IActivityLogStaged = {
            ...thistleLog,
            userId: 'user-clover',
        };

        it('reads the recipient, creates the session on the transaction, stamps the login, caches the entry, and enqueues the purge and the new-device notice', async () => {
            const callOrder: string[] = [];
            notificationService.getRecipient.mockImplementation(async () => {
                callOrder.push('getRecipient');

                return recipient;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtService.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionService.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });

            const result = await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                loginAt,
                requestLog
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(authJwtService.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-bramble',
                    jti: 'jti-bramble',
                    deviceOwnershipId: 'device-ownership-bramble',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionService.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
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
            expect(callOrder).toEqual([
                'getRecipient',
                'committed',
                'createTokens',
                'setLogin',
            ]);
        });

        it('announces no new device for an existing one', async () => {
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
        });

        it('revokes the new session, purges it, and rethrows when the login cache write rejects, still enqueueing the repeat-device purge and the new-device notice', async () => {
            const failure = new Error('cache down');
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({ rawError: failure });
            expect(sessionService.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledTimes(
                1
            );
        });

        it('rethrows a typed login cache failure unwrapped after the compensating revoke', async () => {
            const failure = new RedisUnavailableException();
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(sessionService.revokeIfActive).toHaveBeenCalledTimes(1);
        });

        it("still enqueues the affected users' purges and stages no activity row when the login cache write rejects", async () => {
            const failure = new Error('cache down');
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );
            sessionService.setLogin.mockRejectedValue(failure);
            sessionService.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({ rawError: failure });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-thistle',
                affected[0]!.sessions
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-clover',
                affected[1]!.sessions
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('revokes nothing when the login cache write succeeds', async () => {
            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(sessionService.revokeIfActive).not.toHaveBeenCalled();
        });

        it('fails the login before the transaction when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before any write when the store has no request log', async () => {
            sessionService.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(authJwtService.createTokens).not.toHaveBeenCalled();
            expect(sessionService.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it("reads the other users' ownerships of the device and revokes their sessions on the login transaction for a new ownership", async () => {
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                deviceService.getOtherOwnershipIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-bramble', 'user-bramble');
            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-ownership-thistle', 'device-ownership-clover'],
                'user-bramble',
                now
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
        });

        it('signs other users out for a repeat ownership too', async () => {
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                deviceService.getOtherOwnershipIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-bramble', 'user-bramble');
            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                ['device-ownership-thistle', 'device-ownership-clover'],
                'user-bramble',
                now
            );
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalled();
        });

        it('runs no session revoke when no other user owns the device', async () => {
            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).not.toHaveBeenCalled();
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
        });

        it('enqueues one purge per affected user after the commit and stages one activity row each', async () => {
            const callOrder: string[] = [];
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );
            sessionUtil.mapActivityLogRevokeAllTargetMetadata.mockReturnValue(
                revokeMetadata
            );
            activityLogService.prepare
                .mockReturnValueOnce(thistleLog)
                .mockReturnValueOnce(cloverLog);
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async userId => {
                callOrder.push(`purge:${userId}`);
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await useCase['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-thistle',
                affected[0]!.sessions
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-clover',
                affected[1]!.sessions
            );
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-bramble', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-bramble', 1);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                userId: 'user-thistle',
                createdBy: 'user-bramble',
                metadata: revokeMetadata,
            });
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                userId: 'user-clover',
                createdBy: 'user-bramble',
                metadata: revokeMetadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                thistleLog,
                cloverLog,
            ]);
            expect(callOrder).toEqual([
                'committed',
                'purge:user-bramble',
                'purge:user-thistle',
                'purge:user-clover',
                'stagePrepared',
            ]);
        });
    });
});
