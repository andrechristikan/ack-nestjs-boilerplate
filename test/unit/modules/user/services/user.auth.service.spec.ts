import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumUserReauthenticationAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    DeviceOwnership,
    User,
    Verification,
} from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';
import type { IMfaCheck } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { DeviceService } from '@modules/device/services/device.service';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { RequestContextService } from '@common/request/services/request.context.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import type {
    IUser,
    IUserReauthenticationCheck,
    IUserReauthenticationInput,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';

describe('UserAuthService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userRequestContext = buildRequestContext();
    const userApiKeyContext = buildApiKeyContext();
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let service: UserAuthService;

    const baseUser: IUser = {
        id: 'user-halcyon',
        name: 'Halcyon Vane',
        username: 'halcyonVane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'halcyon@example.com',
        roleId: 'role-halcyon',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-halcyon',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
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
            id: 'role-halcyon',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthService,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserPasswordService,
                    useValue: userPasswordService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: UserService, useValue: userService },
                { provide: MfaService, useValue: mfaService },
                {
                    provide: MfaChallengeService,
                    useValue: mfaChallengeService,
                },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                { provide: AuthUtil, useValue: authUtil },
                { provide: SessionUtil, useValue: sessionUtil },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ActivityLogService,
                    useValue: activityLogService,
                },
            ],
        }).compile();
        service = module.get(UserAuthService);
    });

    describe('getOneForCredentialLogin', () => {
        it('returns the credential of the active user holding a password', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordService.getCredential.mockReturnValue({
                user: baseUser,
                hashedPassword: 'hashed-password',
            });

            await expect(
                service.getOneForCredentialLogin(baseUser.email)
            ).resolves.toEqual({
                user: baseUser,
                hashedPassword: 'hashed-password',
            });
            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                baseUser.email
            );
            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                baseUser
            );
        });

        it('throws UserCredentialInvalidException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneForCredentialLogin('missing@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });
            expect(userPasswordService.getCredential).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForCredentialLogin('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(userPasswordService.getCredential).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user has no password', async () => {
            const passwordless = { ...baseUser, password: null };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                passwordless
            );
            userPasswordService.getCredential.mockReturnValue(null);

            await expect(
                service.getOneForCredentialLogin('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                passwordless
            );
        });
    });

    describe('isCredentialMatch', () => {
        const credential = {
            user: baseUser,
            hashedPassword: 'hashed-password',
        };

        it('returns true for the right password and writes nothing', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(true);

            await expect(
                service.isCredentialMatch(credential, 'plain-password')
            ).resolves.toBe(true);
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.add).not.toHaveBeenCalled();
        });

        it('returns false on a wrong password', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(false);

            await expect(
                service.isCredentialMatch(credential, 'wrong-password')
            ).resolves.toBe(false);
        });

        it('returns false for a null password without comparing', async () => {
            await expect(
                service.isCredentialMatch(credential, null)
            ).resolves.toBe(false);
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordAttempt', () => {
        const credential = {
            user: baseUser,
            hashedPassword: 'hashed-password',
        };

        it('resolves and writes nothing when the password matches', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(true);
            authPasswordUtil.isPasswordExpired.mockReturnValue(false);

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    'plain-password'
                )
            ).resolves.toBeUndefined();
            expect(
                userPasswordService.assertPasswordAttemptAvailable
            ).toHaveBeenCalledWith(baseUser);
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(authPasswordUtil.isPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserPasswordAttemptMaxException without comparing when the account is locked', async () => {
            userPasswordService.assertPasswordAttemptAvailable.mockImplementation(
                () => {
                    throw new UserPasswordAttemptMaxException();
                }
            );

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    'plain-password'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                messagePath: 'user.error.passwordAttemptMax',
            });
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('counts the failure then throws UserPasswordNotMatchException on a wrong password below the budget', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                false
            );

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    'wrong-password'
                )
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
                userPasswordService.countFailedPasswordAttempt
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, baseUser);
            expect(authPasswordUtil.isPasswordExpired).not.toHaveBeenCalled();
        });

        it('throws UserPasswordAttemptMaxException when the counted failure locked the account', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                true
            );

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    'wrong-password'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                messagePath: 'user.error.passwordAttemptMax',
            });
        });

        it('counts the failure and throws UserPasswordNotMatchException for a null password without comparing', async () => {
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                false
            );

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    null
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, baseUser);
        });

        it('throws UserPasswordExpiredException when the matched password has expired', async () => {
            authPasswordUtil.isPasswordMatched.mockResolvedValue(true);
            authPasswordUtil.isPasswordExpired.mockReturnValue(true);

            await expect(
                service.assertPasswordAttempt(
                    requestContext,
                    apiKeyContext,
                    credential,
                    'plain-password'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                messagePath: 'user.error.passwordExpired',
            });
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
        });
    });

    describe('assertCurrentPassword', () => {
        const credential = {
            user: baseUser,
            hashedPassword: 'hashed-password',
        };

        it('writes nothing and returns when the correct password is given', async () => {
            userPasswordService.getCredential.mockReturnValue(credential);
            authPasswordUtil.isPasswordMatched.mockResolvedValue(true);
            authPasswordUtil.isPasswordExpired.mockReturnValue(false);

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    'plain-password'
                )
            ).resolves.toBeUndefined();
            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                baseUser
            );
            expect(
                userPasswordService.assertPasswordAttemptAvailable
            ).toHaveBeenCalledWith(baseUser);
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.add).not.toHaveBeenCalled();
        });

        it('returns without comparing when the account has no password', async () => {
            userPasswordService.getCredential.mockReturnValue(null);

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    null
                )
            ).resolves.toBeUndefined();
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
            expect(
                userPasswordService.assertPasswordAttemptAvailable
            ).not.toHaveBeenCalled();
        });

        it('counts the failure and throws UserPasswordNotMatchException on a wrong password below the budget', async () => {
            userPasswordService.getCredential.mockReturnValue(credential);
            authPasswordUtil.isPasswordMatched.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                false
            );

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    'wrong'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                baseUser
            );
        });

        it('throws the max-attempt exception without comparing when the account is locked', async () => {
            userPasswordService.getCredential.mockReturnValue(credential);
            userPasswordService.assertPasswordAttemptAvailable.mockImplementation(
                () => {
                    throw new UserPasswordAttemptMaxException();
                }
            );

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    'plain'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
            });
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordNotExpired', () => {
        it('returns when the password has not expired', () => {
            authPasswordUtil.isPasswordExpired.mockReturnValue(false);

            expect(() =>
                service.assertPasswordNotExpired(baseUser)
            ).not.toThrow();
            expect(authPasswordUtil.isPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });

        it('throws UserPasswordExpiredException when the password has expired', () => {
            authPasswordUtil.isPasswordExpired.mockReturnValue(true);

            expect(() => service.assertPasswordNotExpired(baseUser)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordExpired,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.passwordExpired
                        ],
                    messagePath: 'user.error.passwordExpired',
                })
            );
            expect(authPasswordUtil.isPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });
    });

    describe('assertPasswordMatched', () => {
        it('passes when the password matched', () => {
            expect(() => service.assertPasswordMatched(true)).not.toThrow();
        });

        it('throws UserPasswordNotMatchException when the password did not match', () => {
            expect(() => service.assertPasswordMatched(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordNotMatch,
                    messagePath: 'user.error.passwordNotMatch',
                })
            );
        });
    });

    describe('assertCredentialMatched', () => {
        it('passes when the password matched', () => {
            expect(() => service.assertCredentialMatched(true)).not.toThrow();
        });

        it('throws UserCredentialInvalidException when the password did not match', () => {
            expect(() => service.assertCredentialMatched(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.credentialInvalid,
                    messagePath: 'user.error.credentialInvalid',
                })
            );
        });
    });

    describe('getOneByEmail', () => {
        it('returns the live user of the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await expect(service.getOneByEmail(baseUser.email)).resolves.toBe(
                baseUser
            );
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await service.getOneByEmail('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('returns null when no live user holds the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneByEmail('missing@example.com')
            ).resolves.toBeNull();
        });
    });

    describe('getOneForSocialLogin', () => {
        it('returns the active user of the email', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await expect(
                service.getOneForSocialLogin(baseUser.email)
            ).resolves.toBe(baseUser);
        });

        it('looks the email up trimmed and lowercased', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);

            await service.getOneForSocialLogin('  Halcyon@Example.COM ');

            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                'halcyon@example.com'
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneForSocialLogin('missing@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForSocialLogin('halcyon@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });
    });

    describe('getOneForSocialLoginById', () => {
        it('returns the active user read by id with its role', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForSocialLoginById(baseUser.id)
            ).resolves.toBe(baseUser);

            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                baseUser.id,
                null
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForSocialLoginById('missing-user')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForSocialLoginById(baseUser.id)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });
    });

    describe('verifyEmailBySocialInTx', () => {
        it('returns the user merged with the row written on the given tx with the verified entry', async () => {
            const user = { ...baseUser, isVerified: false, verifiedAt: null };
            const writtenRow: User = {
                id: 'user-halcyon',
                name: 'Halcyon Vane',
                username: 'halcyonVane',
                isVerified: true,
                verifiedAt: new Date('2026-03-01T00:00:00.000Z'),
                email: 'halcyon@example.com',
                roleId: 'role-halcyon',
                password: null,
                passwordExpired: null,
                passwordCreated: null,
                passwordAttempt: 0,
                passwordLockedUntil: null,
                signUpAt: new Date('2026-01-01T00:00:00.000Z'),
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                status: EnumUserStatus.active,
                gender: null,
                countryId: 'country-halcyon',
                lastLoginAt: null,
                lastIPAddress: null,
                lastLoginFrom: EnumUserLoginFrom.website,
                lastLoginWith: EnumUserLoginWith.credential,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-03-01T00:00:00.000Z'),
                updatedBy: 'user-halcyon',
                deletedAt: null,
                deletedBy: null,
            };
            const tx = {} as IDatabaseTransactionClient;
            userVerificationService.markVerifiedBySocialInTx.mockResolvedValue(
                writtenRow
            );
            activityLogService.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.verifyEmailBySocialInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    user
                )
            ).resolves.toEqual({
                ...writtenRow,
                photo: user.photo,
                role: user.role,
            });
            expect(
                userVerificationService.markVerifiedBySocialInTx
            ).toHaveBeenCalledWith(tx, user.id);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: user.id,
                    createdBy: user.id,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });
    });

    describe('assertVerified', () => {
        it('passes for a verified user', () => {
            expect(() => service.assertVerified(baseUser)).not.toThrow();
        });

        it('throws UserEmailNotVerifiedException for an unverified user', () => {
            expect(() =>
                service.assertVerified({ ...baseUser, isVerified: false })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.emailNotVerified,
                    messagePath: 'user.error.emailNotVerified',
                })
            );
        });
    });

    describe('createTokenAndSessionInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const now = new Date('2026-03-01T00:00:00.000Z');
        const loginAt = new Date('2026-03-01T00:05:00.000Z');
        const requestLog: IRequestLog = {
            userAgent: {
                ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)',
                browser: {
                    name: 'Chrome',
                    version: '126.0',
                    major: '126',
                    type: null,
                },
                cpu: null,
                device: { type: 'mobile', vendor: 'Apple', model: 'iPhone' },
                engine: null,
                os: { name: 'iOS', version: '17.5' },
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        };
        const requestContext: IRequestContext = {
            ...buildRequestContext(),
            requestLog: requestLog,
        };
        const apiKeyContext = buildApiKeyContext();
        const tokens: IAuthToken = {
            tokenType: 'Bearer',
            roleKey: EnumRolePlatformKey.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };
        const deviceIdentity: IDeviceIdentity = {
            fingerprint: 'device-halcyon',
            name: null,
            platform: EnumDevicePlatform.web,
            notificationToken: null,
        };
        const ownership: DeviceOwnership = {
            id: 'device-ownership-halcyon',
            deviceId: 'device-halcyon',
            userId: 'user-halcyon',
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            lastActiveAt: now,
            notificationToken: 'token-halcyon',
            notificationProvider: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        };
        const upsert: IDeviceLoginUpsert = {
            device: {
                id: 'device-halcyon',
                fingerprint: 'device-halcyon',
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
        const revokedRef = [{ id: 'session-earlier' }];
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
        const thistleMetadata: IActivityLogMetadata = {
            actorUserId: 'user-halcyon',
            sessionCount: 2,
        };
        const cloverMetadata: IActivityLogMetadata = {
            actorUserId: 'user-halcyon',
            sessionCount: 1,
        };

        const newDeviceEffect: INotificationNotifyEffect = {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind: EnumNotificationKind.newDeviceLogin,
                context: {
                    userId: 'user-halcyon',
                    proceedBy: 'user-halcyon',
                    snapshot: null,
                    verificationId: null,
                },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };

        beforeEach(() => {
            notificationService.notify.mockReturnValue(newDeviceEffect);
            requestContextService.resolveDevice.mockReturnValue(
                'Linux Desktop'
            );
            requestContextService.resolveCity.mockReturnValue(
                'Unknown Location'
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:05:00.000Z'
            );
            helperDateService.create.mockReturnValue(now);
            helperDateService.forward.mockImplementation(date => date);
            activityLogService.recordEffect.mockImplementation(
                (
                    _requestContext,
                    _apiKeyContext,
                    _authContext,
                    _workspaceContext,
                    input
                ) => ({
                    ...entryEffect,
                    idempotencyKey: `${input.action}:${input.userId ?? ''}`,
                })
            );
            deviceService.upsertForLoginInTx.mockResolvedValue(upsert);
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                []
            );
            authUtil.createLoginIdentifiers.mockReturnValue({
                sessionId: 'session-halcyon',
                jti: 'jti-halcyon',
            });
            authJwtService.createTokens.mockReturnValue(tokens);
            Object.defineProperty(
                authJwtService,
                'refreshTokenExpiresInSeconds',
                { value: 2592000, configurable: true }
            );
        });

        it('upserts the device, creates the session, and stamps the login on the given tx without opening one', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                deviceIdentity,
                now
            );
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon',
                'jti-halcyon',
                loginAt,
                requestLog
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
        });

        it('adds the newDeviceLogin effect on the transaction after the writes when the device is new', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(requestContextService.resolveDevice).toHaveBeenCalledWith(
                requestLog.userAgent
            );
            expect(requestContextService.resolveCity).toHaveBeenCalledWith(
                null
            );
            expect(helperDateService.formatToIso).toHaveBeenCalledWith(loginAt);
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.newDeviceLogin,
                {
                    userId: 'user-halcyon',
                    proceedBy: 'user-halcyon',
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-03-01T00:05:00.000Z',
                    device: 'Linux Desktop',
                    city: 'Unknown Location',
                    browser: 'Chrome 126.0',
                    deviceDetail: 'Apple iPhone (mobile)',
                    os: 'iOS 17.5',
                    ipAddress: '127.0.0.1',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    idempotencyKey: 'userLoginCredential:user-halcyon',
                }),
                newDeviceEffect,
            ]);
            expect(userService.updateLoginInTx).toHaveBeenCalledBefore(
                outboxService.addManyInTx
            );
        });

        it('sends empty display parts and address when the request log has none', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                {
                    ...requestContext,
                    requestLog: {
                        ...requestLog,
                        userAgent: {
                            ...requestLog.userAgent,
                            browser: null,
                            device: null,
                            os: null,
                        },
                        ipAddress: null,
                    },
                },
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.newDeviceLogin,
                expect.objectContaining({
                    browser: ' ',
                    deviceDetail: '  ()',
                    os: ' ',
                    ipAddress: '',
                })
            );
        });

        it('sends empty parts inside a parsed user agent that lacks some fields', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                {
                    ...requestContext,
                    requestLog: {
                        ...requestLog,
                        userAgent: {
                            ...requestLog.userAgent,
                            browser: {
                                name: null,
                                version: null,
                                major: null,
                                type: null,
                            },
                            device: { type: null, vendor: null, model: null },
                            os: { name: null, version: null },
                        },
                    },
                },
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.newDeviceLogin,
                expect.objectContaining({
                    browser: ' ',
                    deviceDetail: '  ()',
                    os: ' ',
                })
            );
        });

        it('adds only the login entry when the device is known', async () => {
            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationService.notify).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    idempotencyKey: 'userLoginCredential:user-halcyon',
                }),
            ]);
        });

        it("revokes the user's earlier sessions on the device only when the device is not new", async () => {
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();

            deviceService.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                'device-ownership-halcyon',
                'user-halcyon',
                now
            );
        });

        it("revokes other users' sessions only when other ownerships exist", async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).not.toHaveBeenCalled();

            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                deviceService.getOtherOwnershipIdsByDeviceInTx
            ).toHaveBeenCalledWith(tx, 'device-halcyon', 'user-halcyon');
            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(tx, otherOwnershipIds, 'user-halcyon', now);
        });

        it('creates the session expiring loginAt plus the refresh lifetime', async () => {
            const expiredAt = new Date('2026-03-31T00:05:00.000Z');
            helperDateService.forward.mockReturnValue(expiredAt);

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(helperDateService.forward).toHaveBeenCalledWith(
                loginAt,
                expect.objectContaining({ seconds: 2592000 })
            );
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon',
                'jti-halcyon',
                expiredAt,
                requestLog
            );
        });

        it('builds the tokens from sessionId, jti, deviceOwnershipId, and loginAt', async () => {
            const result = await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(authJwtService.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-halcyon',
                    jti: 'jti-halcyon',
                    deviceOwnershipId: 'device-ownership-halcyon',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(result).toStrictEqual({
                tokens,
                sessionId: 'session-halcyon',
            });
        });

        it('adds one userRevokeSessionByDeviceLogin entry per affected user, createdBy the logging-in user, after the login entry on the same tx', async () => {
            deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue(
                otherOwnershipIds
            );
            sessionService.revokeByDeviceOwnershipIdsInTx.mockResolvedValue(
                affected
            );
            sessionUtil.mapActivityLogRevokeAllTargetMetadata
                .mockReturnValueOnce(thistleMetadata)
                .mockReturnValueOnce(cloverMetadata);

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-halcyon', 2);
            expect(
                sessionUtil.mapActivityLogRevokeAllTargetMetadata
            ).toHaveBeenCalledWith('user-halcyon', 1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId: 'user-thistle',
                    createdBy: 'user-halcyon',
                    metadata: thistleMetadata,
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId: 'user-clover',
                    createdBy: 'user-halcyon',
                    metadata: cloverMetadata,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    idempotencyKey: 'userLoginCredential:user-halcyon',
                }),
                expect.objectContaining({
                    idempotencyKey:
                        'userRevokeSessionByDeviceLogin:user-thistle',
                }),
                expect.objectContaining({
                    idempotencyKey:
                        'userRevokeSessionByDeviceLogin:user-clover',
                }),
                newDeviceEffect,
            ]);
        });

        it.each([
            [
                EnumUserLoginWith.socialApple,
                EnumActivityLogAction.userLoginApple,
            ],
            [
                EnumUserLoginWith.socialGoogle,
                EnumActivityLogAction.userLoginGoogle,
            ],
            [EnumUserLoginWith.passkey, EnumActivityLogAction.userLoginPasskey],
            [
                EnumUserLoginWith.credential,
                EnumActivityLogAction.userLoginCredential,
            ],
            [
                'unknown' as EnumUserLoginWith,
                EnumActivityLogAction.userLoginCredential,
            ],
        ])(
            'adds the login entry for the %s login method',
            async (loginWith, action) => {
                await service.createTokenAndSessionInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    loginWith,
                    loginAt
                );

                expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                    requestContext,
                    apiKeyContext,
                    null,
                    null,
                    {
                        action,
                        userId: 'user-halcyon',
                        createdBy: 'user-halcyon',
                    }
                );
            }
        );

        it('signs the tokens after the writes and opens no transaction', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                authJwtService.createTokens
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs no tokens when a write fails', async () => {
            const failure = new RedisUnavailableException();
            sessionService.createInTx.mockRejectedValue(failure);

            await expect(
                service.createTokenAndSessionInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(authJwtService.createTokens).not.toHaveBeenCalled();
        });
    });

    describe('getOneForMfaLogin', () => {
        it('answers the active verified user with MFA on', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-halcyon',
                null
            );
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-halcyon');
        });

        it('throws UserNotFoundException when the user is gone', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
            });
        });

        it('throws MfaNotEnabledException when MFA is off', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            mfaService.isEnabled.mockResolvedValue(false);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.notEnabled,
            });
        });
    });

    describe('getOneForPasskeyLogin', () => {
        it('answers the active verified user without reading the MFA state', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForPasskeyLogin('user-halcyon')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-halcyon',
                null
            );
            expect(mfaService.isEnabled).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user is gone', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForPasskeyLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
            });
        });

        it('throws UserCredentialInvalidException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.getOneForPasskeyLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });

            await expect(
                service.getOneForPasskeyLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
            });
        });
    });

    describe('createMfaChallengeInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const device: IDeviceIdentity = {
            fingerprint: 'fingerprint-halcyon',
            name: null,
            platform: EnumDevicePlatform.web,
            notificationToken: null,
        };

        it('creates a login challenge with no WebAuthn challenge and null options for a user without a passkey', async () => {
            mfaService.getLoginMethods.mockResolvedValue([
                EnumMfaMethod.totp,
                EnumMfaMethod.backupCode,
            ]);
            mfaChallengeService.createInTx.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 300000,
            });

            await expect(
                service.createMfaChallengeInTx(
                    tx,
                    'user-halcyon',
                    device,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                )
            ).resolves.toEqual({
                challengeToken: 'challenge-token',
                expiresInMs: 300000,
                methods: [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
                passkeyOptions: null,
            });
            expect(mfaService.getLoginMethods).toHaveBeenCalledWith(
                'user-halcyon'
            );
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-halcyon',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: null,
            });
        });

        it('creates the login challenge with the challenge of the assertion options and answers the options for a user with a passkey', async () => {
            const passkeyOptions = {
                challenge: 'challenge-webauthn',
            } as PublicKeyCredentialRequestOptionsJSON;
            mfaService.getLoginMethods.mockResolvedValue([
                EnumMfaMethod.passkey,
                EnumMfaMethod.backupCode,
            ]);
            mfaPasskeyService.getAssertionOptions.mockResolvedValue(
                passkeyOptions
            );
            mfaChallengeService.createInTx.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 300000,
            });

            await expect(
                service.createMfaChallengeInTx(
                    tx,
                    'user-halcyon',
                    device,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                )
            ).resolves.toEqual({
                challengeToken: 'challenge-token',
                expiresInMs: 300000,
                methods: [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
                passkeyOptions,
            });
            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                'user-halcyon'
            );
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-halcyon',
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: 'challenge-webauthn',
            });
        });
    });

    describe('assertReauthentication', () => {
        const credential = {
            user: baseUser,
            hashedPassword: 'hashed-password',
        };
        const input: IUserReauthenticationInput = {
            action: EnumUserReauthenticationAction.deleteSelf,
            password: 'plain-password',
            method: EnumMfaMethod.totp,
            code: '123456',
            backupCode: null,
            passkeyChallengeToken: null,
            passkeyResponse: null,
            otp: null,
        };
        const passkeyResponse = {
            id: 'credential-halcyon',
        } as AuthenticationResponseJSON;
        const passkeyCheck: IMfaCheck = {
            method: EnumMfaMethod.passkey,
            totpStep: null,
            backupCodeHash: null,
            passkey: { id: 'passkey-halcyon', counter: 5 },
        };
        const mfaCheck: IMfaCheck = {
            method: EnumMfaMethod.totp,
            totpStep: 7,
            backupCodeHash: null,
            passkey: null,
        };
        const reauthenticationVerification: Verification = {
            id: 'verification-halcyon',
            userId: 'user-halcyon',
            mobileNumberId: null,
            to: 'halcyon@example.com',
            type: EnumVerificationType.reauthentication,
            action: EnumUserReauthenticationAction.mobileNumberAdd,
            token: 'hashed-otp',
            expiredAt: new Date('2026-03-01T00:05:00.000Z'),
            verifiedAt: null,
            isUsed: false,
            reference: 'VER-halcyon',
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
            createdBy: 'user-halcyon',
            updatedAt: new Date('2026-03-01T00:00:00.000Z'),
            updatedBy: null,
        };

        beforeEach(() => {
            userPasswordService.getCredential.mockReturnValue(credential);
            authPasswordUtil.isPasswordMatched.mockResolvedValue(true);
            authPasswordUtil.isPasswordExpired.mockReturnValue(false);
            mfaService.isEnabled.mockResolvedValue(false);
        });

        it('checks the password, then the MFA code through MfaService.check, when MFA is on', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue(mfaCheck);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    input
                )
            ).resolves.toEqual({
                isPasswordChecked: true,
                mfa: mfaCheck,
                verificationId: null,
                passkeyChallengeToken: null,
            });
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledBefore(
                mfaService.check
            );
            expect(mfaService.check).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                'user-halcyon',
                {
                    method: EnumMfaMethod.totp,
                    code: '123456',
                    backupCode: null,
                    passkeyResponse: null,
                },
                null
            );
        });

        it('passes a backup code on', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue({
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: 'hash-one',
                passkey: null,
            });

            await service.assertReauthentication(
                userRequestContext,
                userApiKeyContext,
                baseUser,
                {
                    ...input,
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'BACKUP1',
                }
            );

            expect(mfaService.check).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                'user-halcyon',
                {
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'BACKUP1',
                    passkeyResponse: null,
                },
                null
            );
        });

        it('answers the MFA exception of the check and counts nothing on the password budget', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockRejectedValue(new MfaInvalidException());

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    { ...input, code: null }
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
                messagePath: 'mfa.error.invalid',
            });
        });

        it('throws MfaMethodRequiredException uncounted when the method is missing', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockRejectedValue(
                new MfaMethodRequiredException()
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    { ...input, method: null }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.methodRequired,

                module: 'mfa',
                messagePath: 'mfa.error.methodRequired',
            });
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('asks no MFA code for the mfaTotpEnable action', async () => {
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        method: null,
                        code: null,
                    }
                )
            ).resolves.toEqual({
                isPasswordChecked: true,
                mfa: null,
                verificationId: null,
                passkeyChallengeToken: null,
            });
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('checks the backup code of a passwordless account with MFA on for the mfaTotpEnable action', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue({
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: 'hash-one',
                passkey: null,
            });

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        password: null,
                        method: EnumMfaMethod.backupCode,
                        code: null,
                        backupCode: 'ABCD1234EF',
                    }
                )
            ).resolves.toMatchObject({
                isPasswordChecked: false,
                mfa: { method: EnumMfaMethod.backupCode },
                verificationId: null,
            });
            expect(mfaService.check).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                'user-halcyon',
                {
                    method: EnumMfaMethod.backupCode,
                    code: null,
                    backupCode: 'ABCD1234EF',
                    passkeyResponse: null,
                },
                null
            );
        });

        it('passes on the MfaMethodRequiredException for a passwordless account with MFA on and no proof at mfaTotpEnable', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockRejectedValue(
                new MfaMethodRequiredException()
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        password: null,
                        method: null,
                        code: null,
                    }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.methodRequired,

                module: 'mfa',
                messagePath: 'mfa.error.methodRequired',
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
        });

        it('asks the email code of a passwordless account with MFA off for the mfaTotpEnable action', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            userVerificationService.getOneActiveReauthentication.mockResolvedValue(
                { id: 'verification-halcyon' } as never
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        password: null,
                        otp: '123456',
                    }
                )
            ).resolves.toMatchObject({
                verificationId: 'verification-halcyon',
            });
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('asks no MFA code and returns no check with MFA off', async () => {
            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    input
                )
            ).resolves.toEqual({
                isPasswordChecked: true,
                mfa: null,
                verificationId: null,
                passkeyChallengeToken: null,
            });
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('asks no email code for an account with a password', async () => {
            await service.assertReauthentication(
                userRequestContext,
                userApiKeyContext,
                baseUser,
                { ...input, otp: '123456' }
            );

            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
        });

        it('asks no email code for an account with no password and MFA on', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue(mfaCheck);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    { ...baseUser, password: null },
                    { ...input, password: null }
                )
            ).resolves.toEqual({
                isPasswordChecked: false,
                mfa: mfaCheck,
                verificationId: null,
                passkeyChallengeToken: null,
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
        });

        it('throws UserReauthenticationOtpRequiredException for an account with neither proof and no email code', async () => {
            userPasswordService.getCredential.mockReturnValue(null);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    { ...baseUser, password: null },
                    { ...input, password: null }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpRequired,
                messagePath: 'user.error.reauthenticationOtpRequired',
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('throws UserReauthenticationOtpInvalidException for a wrong, expired, or other-action email code', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            userVerificationService.getOneActiveReauthentication.mockRejectedValue(
                new UserReauthenticationOtpInvalidException()
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    { ...baseUser, password: null },
                    { ...input, password: null, otp: '000000' }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpInvalid,
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).toHaveBeenCalledWith(
                'user-halcyon',
                EnumUserReauthenticationAction.deleteSelf,
                '000000'
            );
        });

        it('checks the email code of the action and answers its verification id for an account with neither proof', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            userVerificationService.getOneActiveReauthentication.mockResolvedValue(
                reauthenticationVerification
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    { ...baseUser, password: null },
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mobileNumberAdd,
                        password: null,
                        otp: '123456',
                    }
                )
            ).resolves.toEqual({
                isPasswordChecked: false,
                mfa: null,
                verificationId: 'verification-halcyon',
                passkeyChallengeToken: null,
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).toHaveBeenCalledWith(
                'user-halcyon',
                EnumUserReauthenticationAction.mobileNumberAdd,
                '123456'
            );
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('checks the passkey only and never calls the password or TOTP check for a valid passkey proof on an account with a password and TOTP', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                'webauthn-halcyon'
            );
            mfaService.check.mockResolvedValue(passkeyCheck);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        passkeyChallengeToken: 'challenge-halcyon',
                        passkeyResponse,
                    }
                )
            ).resolves.toEqual({
                isPasswordChecked: false,
                mfa: passkeyCheck,
                verificationId: null,
                passkeyChallengeToken: 'challenge-halcyon',
            });
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledWith(
                'challenge-halcyon',
                EnumMfaChallengePurpose.reauthentication,
                'user-halcyon'
            );
            expect(mfaService.check).toHaveBeenCalledTimes(1);
            expect(mfaService.check).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                'user-halcyon',
                {
                    method: EnumMfaMethod.passkey,
                    code: null,
                    backupCode: null,
                    passkeyResponse,
                },
                'webauthn-halcyon'
            );
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
        });

        it('takes a passkey proof for the mfaTotpEnable action too', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                'webauthn-halcyon'
            );
            mfaService.check.mockResolvedValue(passkeyCheck);

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        passkeyChallengeToken: 'challenge-halcyon',
                        passkeyResponse,
                    }
                )
            ).resolves.toMatchObject({ mfa: passkeyCheck });
            expect(authPasswordUtil.isPasswordMatched).not.toHaveBeenCalled();
        });

        it('passes on the MfaChallengeInvalidException of the challenge service and checks nothing', async () => {
            mfaChallengeService.getWebAuthnChallengeForUser.mockRejectedValue(
                new MfaChallengeInvalidException()
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        passkeyChallengeToken: 'challenge-halcyon',
                        passkeyResponse,
                    }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.challengeInvalid,

                module: 'mfa',
                messagePath: 'mfa.error.challengeInvalid',
            });
            expect(mfaService.check).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException for a passkey proof on an account without a passkey', async () => {
            mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                'webauthn-halcyon'
            );
            mfaService.check.mockRejectedValue(
                new MfaMethodUnavailableException()
            );

            await expect(
                service.assertReauthentication(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    {
                        ...input,
                        passkeyChallengeToken: 'challenge-halcyon',
                        passkeyResponse,
                    }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.methodUnavailable,

                module: 'mfa',
                messagePath: 'mfa.error.methodUnavailable',
            });
        });

        it('keeps the password and code order when only one passkey field is present', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.check.mockResolvedValue(mfaCheck);

            await service.assertReauthentication(
                userRequestContext,
                userApiKeyContext,
                baseUser,
                { ...input, passkeyChallengeToken: 'challenge-halcyon' }
            );

            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).not.toHaveBeenCalled();
            expect(authPasswordUtil.isPasswordMatched).toHaveBeenCalledTimes(1);
        });
    });

    describe('assertReauthenticationOtpAllowed', () => {
        it('answers nothing for an account with no password and MFA off', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            mfaService.isEnabled.mockResolvedValue(false);

            await expect(
                service.assertReauthenticationOtpAllowed(baseUser)
            ).resolves.toBeUndefined();
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-halcyon');
        });

        it('throws UserReauthenticationOtpNotAllowedException for an account with a password', async () => {
            userPasswordService.getCredential.mockReturnValue({
                user: baseUser,
                hashedPassword: 'hashed-password',
            });
            mfaService.isEnabled.mockResolvedValue(false);

            await expect(
                service.assertReauthenticationOtpAllowed(baseUser)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.reauthenticationOtpNotAllowed,
            });
        });

        it('throws UserReauthenticationOtpNotAllowedException for an account with MFA on', async () => {
            userPasswordService.getCredential.mockReturnValue(null);
            mfaService.isEnabled.mockResolvedValue(true);

            await expect(
                service.assertReauthenticationOtpAllowed(baseUser)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.reauthenticationOtpNotAllowed,
            });
        });
    });

    describe('completeReauthenticationInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const authContext = buildAuthJwtAccessContext('user-halcyon');
        const mfaCheck: IMfaCheck = {
            method: EnumMfaMethod.backupCode,
            totpStep: null,
            backupCodeHash: 'hash-one',
            passkey: null,
        };
        const passwordOnly: IUserReauthenticationCheck = {
            isPasswordChecked: true,
            mfa: null,
            verificationId: null,
            passkeyChallengeToken: null,
        };
        const both: IUserReauthenticationCheck = {
            isPasswordChecked: true,
            mfa: mfaCheck,
            verificationId: null,
            passkeyChallengeToken: null,
        };

        beforeEach(() => {
            activityLogService.recordEffect.mockReturnValue(entryEffect);
        });

        it('resets only the password counter for a password proof', async () => {
            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    userRequestContext,
                    userApiKeyContext,
                    authContext,
                    passwordOnly
                )
            ).resolves.toBeUndefined();

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-halcyon');
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('completes the MFA proof on the tx and adds the verify entry', async () => {
            await service.completeReauthenticationInTx(
                tx,
                userRequestContext,
                userApiKeyContext,
                authContext,
                both
            );

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-halcyon');
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                mfaCheck
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfa,
                    userId: 'user-halcyon',
                    createdBy: 'user-halcyon',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('claims the reauthentication challenge first, then completes the passkey proof and adds the verify entry on the given tx', async () => {
            const passkeyMfa: IMfaCheck = {
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-halcyon', counter: 5 },
            };

            await service.completeReauthenticationInTx(
                tx,
                userRequestContext,
                userApiKeyContext,
                authContext,
                {
                    isPasswordChecked: false,
                    mfa: passkeyMfa,
                    verificationId: null,
                    passkeyChallengeToken: 'challenge-halcyon',
                }
            );

            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'challenge-halcyon',
                EnumMfaChallengePurpose.reauthentication,
                'user-halcyon'
            );
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledBefore(
                mfaService.completeInTx
            );
            expect(mfaService.completeInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                passkeyMfa
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('completes nothing when the challenge claim is lost', async () => {
            mfaChallengeService.consumeInTx.mockRejectedValue(
                new MfaChallengeInvalidException()
            );

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    userRequestContext,
                    userApiKeyContext,
                    authContext,
                    {
                        isPasswordChecked: false,
                        mfa: mfaCheck,
                        verificationId: null,
                        passkeyChallengeToken: 'challenge-halcyon',
                    }
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.challengeInvalid,

                module: 'mfa',
                messagePath: 'mfa.error.challengeInvalid',
            });
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('claims no challenge for a proof without a passkey token', async () => {
            await service.completeReauthenticationInTx(
                tx,
                userRequestContext,
                userApiKeyContext,
                authContext,
                both
            );

            expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
        });

        it('adds no entry when the MFA completion throws', async () => {
            mfaService.completeInTx.mockRejectedValue(
                new MfaInvalidException()
            );

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    userRequestContext,
                    userApiKeyContext,
                    authContext,
                    both
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.invalid,

                module: 'mfa',
                messagePath: 'mfa.error.invalid',
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('marks the email code used for an account with neither proof', async () => {
            userVerificationService.markUsedInTx.mockResolvedValue(true);

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    userRequestContext,
                    userApiKeyContext,
                    authContext,
                    {
                        isPasswordChecked: false,
                        mfa: null,
                        verificationId: 'verification-halcyon',
                        passkeyChallengeToken: null,
                    }
                )
            ).resolves.toBeUndefined();

            expect(userVerificationService.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'verification-halcyon',
                authContext.userId
            );
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(mfaService.completeInTx).not.toHaveBeenCalled();
        });

        it('throws UserReauthenticationOtpInvalidException when the email code was used first', async () => {
            userVerificationService.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    userRequestContext,
                    userApiKeyContext,
                    authContext,
                    {
                        isPasswordChecked: false,
                        mfa: null,
                        verificationId: 'verification-halcyon',
                        passkeyChallengeToken: null,
                    }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpInvalid,
            });
        });

        it('marks no email code used for a password or MFA proof', async () => {
            await service.completeReauthenticationInTx(
                tx,
                userRequestContext,
                userApiKeyContext,
                authContext,
                passwordOnly
            );

            expect(userVerificationService.markUsedInTx).not.toHaveBeenCalled();
        });
    });
});
