import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
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
import type {
    DeviceOwnership,
    TwoFactor,
    User,
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
} from '@test/unit/helpers/test.unit.request.helper';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
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
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
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
import type {
    IUser,
    IUserTwoFactorEnabled,
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
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    const authTwoFactorService: MockProxy<AuthTwoFactorService> =
        mock<AuthTwoFactorService>();
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
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
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
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                {
                    provide: AuthTwoFactorService,
                    useValue: authTwoFactorService,
                },
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
                { provide: UserUtil, useValue: userUtil },
            ],
        }).compile();
        service = module.get(UserAuthService);
    });

    describe('countCredentialAttempt', () => {
        it('returns the counted attempt of the active user', async () => {
            const counted = {
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: true,
            };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordService.countPasswordAttempt.mockResolvedValue(counted);

            await expect(
                service.countCredentialAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser.email
                )
            ).resolves.toEqual(counted);
            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                baseUser.email
            );
            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, baseUser);
        });

        it('returns the attempt with a spent budget', async () => {
            const spent = {
                user: baseUser,
                hashedPassword: 'hashed-password',
                isAttemptCounted: false,
            };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(baseUser);
            userPasswordService.countPasswordAttempt.mockResolvedValue(spent);

            await expect(
                service.countCredentialAttempt(
                    requestContext,
                    apiKeyContext,
                    baseUser.email
                )
            ).resolves.toEqual(spent);
        });

        it('throws UserCredentialInvalidException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.countCredentialAttempt(
                    requestContext,
                    apiKeyContext,
                    'missing@example.com'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordService.countPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user is not active', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                service.countCredentialAttempt(
                    requestContext,
                    apiKeyContext,
                    'halcyon@example.com'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordService.countPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws UserCredentialInvalidException when the user has no password', async () => {
            const passwordless = { ...baseUser, password: null };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(
                passwordless
            );
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);

            await expect(
                service.countCredentialAttempt(
                    requestContext,
                    apiKeyContext,
                    'halcyon@example.com'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, passwordless);
        });
    });

    describe('verifyCredential', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        it('returns true and resets the attempt counter when the credentials are valid', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.verifyCredential(counted, 'plain-password')
            ).resolves.toBe(true);
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('returns false without resetting the counter on a wrong password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                service.verifyCredential(counted, 'wrong-password')
            ).resolves.toBe(false);
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('returns false for a null password without comparing', async () => {
            await expect(service.verifyCredential(counted, null)).resolves.toBe(
                false
            );
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
        });

        it('returns true and resets the attempt counter when the matched password has expired', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.verifyCredential(counted, 'plain-password')
            ).resolves.toBe(true);
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });
    });

    describe('assertPasswordAttempt', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        it('resolves and resets the attempt counter when the password matches', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.assertPasswordAttempt(counted, 'plain-password')
            ).resolves.toBeUndefined();
            expect(
                userPasswordService.assertAttemptCounted
            ).toHaveBeenCalledWith(true);
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
        });

        it('throws UserPasswordAttemptMaxException without comparing when the budget is spent', async () => {
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                throw new UserPasswordAttemptMaxException();
            });

            await expect(
                service.assertPasswordAttempt(
                    { ...counted, isAttemptCounted: false },
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
            expect(
                userPasswordService.assertAttemptCounted
            ).toHaveBeenCalledWith(false);
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(false);

            await expect(
                service.assertPasswordAttempt(counted, 'wrong-password')
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
                userPasswordService.resetPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                authPasswordUtil.checkPasswordExpired
            ).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException for a null password without comparing', async () => {
            await expect(
                service.assertPasswordAttempt(counted, null)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                messagePath: 'user.error.passwordNotMatch',
            });
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserPasswordExpiredException when the matched password has expired', async () => {
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.assertPasswordAttempt(counted, 'plain-password')
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
                userPasswordService.resetPasswordAttempt
            ).toHaveBeenCalledWith(baseUser.id);
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });
    });

    describe('assertCurrentPassword', () => {
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        it('counts the attempt with the context, then asserts the password of the counted attempt', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(counted);
            authPasswordUtil.validatePassword.mockResolvedValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    'plain-password'
                )
            ).resolves.toBeUndefined();
            expect(
                userPasswordService.countPasswordAttempt
            ).toHaveBeenCalledWith(
                userRequestContext,
                userApiKeyContext,
                baseUser
            );
            expect(authPasswordUtil.validatePassword).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
        });

        it('returns without comparing when the account has no password', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(null);

            await expect(
                service.assertCurrentPassword(
                    userRequestContext,
                    userApiKeyContext,
                    baseUser,
                    null
                )
            ).resolves.toBeUndefined();
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });

        it('throws UserPasswordNotMatchException on a wrong password', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue(counted);
            authPasswordUtil.validatePassword.mockResolvedValue(false);

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
        });

        it('throws the max-attempt exception without comparing when the budget is spent', async () => {
            userPasswordService.countPasswordAttempt.mockResolvedValue({
                ...counted,
                isAttemptCounted: false,
            });
            userPasswordService.assertAttemptCounted.mockImplementation(() => {
                throw new UserPasswordAttemptMaxException();
            });

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
            expect(authPasswordUtil.validatePassword).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordNotExpired', () => {
        it('returns when the password has not expired', () => {
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            expect(() =>
                service.assertPasswordNotExpired(baseUser)
            ).not.toThrow();
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
                baseUser.passwordExpired
            );
        });

        it('throws UserPasswordExpiredException when the password has expired', () => {
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

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
            expect(authPasswordUtil.checkPasswordExpired).toHaveBeenCalledWith(
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

    describe('verifyEmailBySocial', () => {
        it('returns the user merged with the row written on one tx with the verified entry', async () => {
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
                updatedAt: new Date('2026-03-01T00:00:00.000Z'),
                updatedBy: 'user-halcyon',
                deletedAt: null,
                deletedBy: null,
            };
            const tx = {} as IDatabaseTransactionClient;
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            userVerificationService.markVerifiedBySocialInTx.mockResolvedValue(
                writtenRow
            );
            activityLogService.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.verifyEmailBySocial(requestContext, apiKeyContext, user)
            ).resolves.toEqual({
                ...writtenRow,
                role: user.role,
                twoFactor: user.twoFactor,
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

    describe('createTokenAndSession', () => {
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
            roleType: EnumRoleType.user,
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
                },
                recipient: null,
                notificationId: null,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
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
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
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
                'jwtRefreshTokenExpirationTimeInSeconds',
                { value: 2592000, configurable: true }
            );
        });

        it('upserts the device, creates the session, and stamps the login on one tx', async () => {
            await service.createTokenAndSession(
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
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
            await service.createTokenAndSession(
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
            await service.createTokenAndSession(
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
            await service.createTokenAndSession(
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

            await service.createTokenAndSession(
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

            await service.createTokenAndSession(
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

            await service.createTokenAndSession(
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
            await service.createTokenAndSession(
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

            await service.createTokenAndSession(
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

            await service.createTokenAndSession(
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
            const result = await service.createTokenAndSession(
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
            expect(result).toEqual({
                tokens,
                sessionId: 'session-halcyon',
                jti: 'jti-halcyon',
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

            await service.createTokenAndSession(
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

        it('adds the login entry for the login method built from the passed context', async () => {
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginGoogle
            );

            await service.createTokenAndSession(
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                loginAt
            );

            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userLoginGoogle,
                    userId: 'user-halcyon',
                    createdBy: 'user-halcyon',
                }
            );
        });

        it('signs no tokens when the transaction fails', async () => {
            const failure = new RedisUnavailableException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.createTokenAndSession(
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

    describe('createTwoFactorChallenge', () => {
        const deviceIdentity: IDeviceIdentity = {
            fingerprint: 'device-halcyon',
            name: null,
            platform: EnumDevicePlatform.web,
            notificationToken: null,
        };
        const twoFactor: TwoFactor = {
            id: 'two-factor-halcyon',
            userId: 'user-halcyon',
            secret: 'encrypted-secret',
            pendingSecret: null,
            backupCodes: ['hash-one'],
            enabled: true,
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
        const twoFactorUser: IUserTwoFactorEnabled = { ...baseUser, twoFactor };
        const setupUser: IUserTwoFactorEnabled = {
            ...baseUser,
            twoFactor: { ...twoFactor, requiredSetup: true },
        };

        beforeEach(() => {
            authTwoFactorService.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
        });

        it('returns the setup challenge after saving the pending secret when setup is required', async () => {
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(
                service.createTwoFactorChallenge(
                    requestContext,
                    apiKeyContext,
                    setupUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                )
            ).resolves.toEqual({
                isRequiredSetup: true,
                challengeToken: 'challenge-token',
                challengeExpiresInMs: 60000,
                backupCodesRemaining: 1,
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            expect(authTwoFactorService.createChallenge).toHaveBeenCalledWith({
                userId: 'user-halcyon',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(userTwoFactorService.setup).toHaveBeenCalledWith(setupUser);
            expect(userTwoFactorService.saveSetup).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-halcyon',
                'encrypted-secret'
            );
        });

        it('writes no secret when the challenge fails during setup', async () => {
            const failure = new Error('challenge failed');
            authTwoFactorService.createChallenge.mockRejectedValue(failure);
            userTwoFactorService.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(
                service.createTwoFactorChallenge(
                    requestContext,
                    apiKeyContext,
                    setupUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                )
            ).rejects.toBe(failure);
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });

        it('returns the verify challenge without a setup when setup is not required', async () => {
            await expect(
                service.createTwoFactorChallenge(
                    requestContext,
                    apiKeyContext,
                    twoFactorUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential
                )
            ).resolves.toEqual({
                isRequiredSetup: false,
                challengeToken: 'challenge-token',
                challengeExpiresInMs: 60000,
                backupCodesRemaining: 1,
            });

            expect(userTwoFactorService.setup).not.toHaveBeenCalled();
            expect(userTwoFactorService.saveSetup).not.toHaveBeenCalled();
        });
    });

    describe('requiresTwoFactorSetup', () => {
        const enabled: TwoFactor = {
            id: 'two-factor-halcyon',
            userId: 'user-halcyon',
            secret: 'encrypted-secret',
            pendingSecret: null,
            backupCodes: [],
            enabled: true,
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

        it('returns true when the enabled row still requires setup', () => {
            expect(
                service['requiresTwoFactorSetup']({
                    ...baseUser,
                    twoFactor: { ...enabled, requiredSetup: true },
                })
            ).toBe(true);
        });

        it('returns false when the enabled row requires no setup', () => {
            expect(
                service['requiresTwoFactorSetup']({
                    ...baseUser,
                    twoFactor: { ...enabled, requiredSetup: false },
                })
            ).toBe(false);
        });
    });
});
