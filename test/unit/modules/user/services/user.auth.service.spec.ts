import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserReauthenticationAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type {
    DeviceOwnership,
    User,
    Verification,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import type { IDeviceLoginUpsert } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { RequestContextService } from '@common/request/services/request.context.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
import { UserUtil } from '@modules/user/utils/user.util';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import type {
    IUser,
    IUserPasswordAttemptLimit,
    IUserReauthenticationInput,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { ConfigService } from '@nestjs/config';
import type { MockInstance } from 'vitest';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserAuthService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const authJwtService: MockProxy<AuthJwtService> = mock<AuthJwtService>();
    let argon2Compare: MockInstance<HelperHashService['argon2Compare']>;
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let service: UserAuthService;

    const baseUser: IUser = {
        ...buildUser('user-halcyon', 'halcyon@example.com'),
        isVerified: true,
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));

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
                UserUtil,
                HelperHashService,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: AuthJwtService, useValue: authJwtService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                HelperDateService,
                HelperStringService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
                {
                    provide: ActivityLogQueue,
                    useValue: activityLogQueue,
                },
            ],
        }).compile();
        service = module.get(UserAuthService);
        argon2Compare = vi
            .spyOn(module.get(HelperHashService), 'argon2Compare')
            .mockResolvedValue(false);
    });

    describe('getOneForCredentialLogin', () => {
        it('returns the credential of the active user holding a password', async () => {
            const user = { ...baseUser, password: 'hashed-password' };
            userRepository.findOneWithRoleByEmail.mockResolvedValue(user);
            userPasswordService.getCredential.mockReturnValue({
                user,
                hashedPassword: 'hashed-password',
            });

            await expect(
                service.getOneForCredentialLogin(user.email)
            ).resolves.toEqual({
                user,
                hashedPassword: 'hashed-password',
            });
            expect(userRepository.findOneWithRoleByEmail).toHaveBeenCalledWith(
                user.email
            );
            expect(userPasswordService.getCredential).toHaveBeenCalledWith(
                user
            );
        });

        it('throws UserCredentialInvalidException when the user does not exist', async () => {
            userRepository.findOneWithRoleByEmail.mockResolvedValue(null);

            await expect(
                service.getOneForCredentialLogin('missing@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
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
            argon2Compare.mockResolvedValue(true);

            await expect(
                service.isCredentialMatch(credential, 'plain-password')
            ).resolves.toBe(true);
            expect(argon2Compare).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('returns false on a wrong password', async () => {
            argon2Compare.mockResolvedValue(false);

            await expect(
                service.isCredentialMatch(credential, 'wrong-password')
            ).resolves.toBe(false);
        });

        it('returns false for a null password without comparing', async () => {
            await expect(
                service.isCredentialMatch(credential, null)
            ).resolves.toBe(false);
            expect(argon2Compare).not.toHaveBeenCalled();
        });
    });

    describe('assertPasswordNotExpired', () => {
        it('returns when the password has not expired', () => {
            expect(() =>
                service.assertPasswordNotExpired({
                    ...baseUser,
                    passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                })
            ).not.toThrow();
        });

        it('throws UserPasswordExpiredException when the password has expired', () => {
            expect(() =>
                service.assertPasswordNotExpired({
                    ...baseUser,
                    passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordExpired,
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

    describe('assertSocialLoginAllowed', () => {
        it('returns the active user', () => {
            expect(service.assertSocialLoginAllowed(baseUser)).toBe(baseUser);
        });

        it('throws UserNotFoundException on a null user', () => {
            expect(() => service.assertSocialLoginAllowed(null)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.notFound,
                })
            );
        });

        it('throws UserInactiveForbiddenException when the user is not active', () => {
            expect(() =>
                service.assertSocialLoginAllowed({
                    ...baseUser,
                    status: EnumUserStatus.inactive,
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.inactiveForbidden,
                })
            );
        });
    });

    describe('getOneForSocialLoginById', () => {
        it('returns the active user read by id with its role', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForSocialLoginById(baseUser.id)
            ).resolves.toBe(baseUser);

            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                baseUser.id
            );
        });

        it('throws UserNotFoundException when the user does not exist', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForSocialLoginById('missing-user')
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

            await expect(
                service.getOneForSocialLoginById(baseUser.id)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
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
                lastIpAddress: null,
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
            userVerificationService.markVerifiedBySocialInTx.mockResolvedValue(
                writtenRow
            );
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.verifyEmailBySocialInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    user
                )
            ).resolves.toEqual({
                ...writtenRow,
                role: user.role,
            });
            expect(
                userVerificationService.markVerifiedBySocialInTx
            ).toHaveBeenCalledWith(tx, user.id);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userEmailVerified,
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
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
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
            otherOwnershipIds: [],
        };
        const revokedRef = [{ id: 'session-earlier', userId: 'user-1' }];
        const otherOwnershipIds = [
            'device-ownership-thistle',
            'device-ownership-clover',
        ];
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
            notificationQueue.notify.mockReturnValue(newDeviceEffect);
            requestContextService.resolveDevice.mockReturnValue(
                'Linux Desktop'
            );
            requestContextService.resolveCity.mockReturnValue(
                'Unknown Location'
            );
            vi.setSystemTime(now);
            activityLogQueue.recordEffect.mockImplementation(
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
            authJwtService.createLoginIdentifiers.mockReturnValue({
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

        it('creates the session on the upserted ownership and stamps the login with the reset flag on the given tx without opening one', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                true
            );

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                'session-halcyon',
                'device-ownership-halcyon',
                'jti-halcyon',
                new Date('2026-03-31T00:05:00.000Z'),
                requestLog
            );
            expect(userService.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-halcyon',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now,
                true
            );
        });

        it('stamps no login when the caller stamped it in the create', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                loginAt,
                true,
                false
            );

            expect(sessionService.createInTx).toHaveBeenCalledTimes(1);
            expect(userService.updateLoginInTx).not.toHaveBeenCalled();
        });

        it('adds the newDeviceLogin effect on the transaction after the writes when the device is new', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(requestContextService.resolveDevice).toHaveBeenCalledWith(
                requestLog.userAgent
            );
            expect(requestContextService.resolveCity).toHaveBeenCalledWith(
                null
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
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
                    idempotencyKey: 'userLoggedInWithCredential:user-halcyon',
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
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(notificationQueue.notify).toHaveBeenCalledWith(
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
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.newDeviceLogin,
                expect.objectContaining({
                    browser: ' ',
                    deviceDetail: '  ()',
                    os: ' ',
                })
            );
        });

        it('adds only the login entry when the device is known', async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                { ...upsert, isNewDevice: false },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(notificationQueue.notify).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({
                    idempotencyKey: 'userLoggedInWithCredential:user-halcyon',
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
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                { ...upsert, isNewDevice: false },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
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

        it("revokes other users' sessions with the two contexts only when other ownerships exist", async () => {
            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).not.toHaveBeenCalled();

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                { ...upsert, otherOwnershipIds },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(
                sessionService.revokeByDeviceOwnershipIdsInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                otherOwnershipIds,
                'user-halcyon',
                now
            );
        });

        it('creates the session expiring loginAt plus the refresh lifetime', async () => {
            const expiredAt = new Date('2026-03-31T00:05:00.000Z');

            await service.createTokenAndSessionInTx(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
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
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
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

        it.each([
            [
                EnumUserLoginWith.socialApple,
                EnumActivityLogAction.userLoggedInWithApple,
            ],
            [
                EnumUserLoginWith.socialGoogle,
                EnumActivityLogAction.userLoggedInWithGoogle,
            ],
            [
                EnumUserLoginWith.passkey,
                EnumActivityLogAction.userLoggedInWithPasskey,
            ],
            [
                EnumUserLoginWith.credential,
                EnumActivityLogAction.userLoggedInWithCredential,
            ],
            [
                'unknown' as EnumUserLoginWith,
                EnumActivityLogAction.userLoggedInWithCredential,
            ],
        ])(
            'adds the login entry for the %s login method',
            async (loginWith, action) => {
                await service.createTokenAndSessionInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    baseUser,
                    upsert,
                    EnumUserLoginFrom.website,
                    loginWith,
                    loginAt,
                    false,
                    false
                );

                expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
                upsert,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt,
                false,
                false
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                authJwtService.createTokens
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
                    upsert,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt,
                    false,
                    false
                )
            ).rejects.toBe(failure);
            expect(authJwtService.createTokens).not.toHaveBeenCalled();
        });
    });

    describe('getOneForMfaLogin', () => {
        it('answers the active verified user and reads no MFA state', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-halcyon'
            );
        });

        it('throws UserNotFoundException when the user is gone', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

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

            await expect(
                service.getOneForMfaLogin('user-halcyon')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
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
                'user-halcyon'
            );
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

    describe('checkReauthenticationPassword', () => {
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
        const passwordLimit: IUserPasswordAttemptLimit = {
            maxAttempts: 5,
            lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
        };

        beforeEach(() => {
            userPasswordService.getCredential.mockReturnValue(credential);
            argon2Compare.mockResolvedValue(true);
        });

        it('answers unchecked with no limit and checks nothing when both passkey fields are present', async () => {
            await expect(
                service.checkReauthenticationPassword(baseUser, {
                    ...input,
                    passkeyChallengeToken: 'challenge-halcyon',
                    passkeyResponse,
                })
            ).resolves.toEqual({ isPasswordChecked: false, limit: null });
            expect(userPasswordService.getCredential).not.toHaveBeenCalled();
            expect(argon2Compare).not.toHaveBeenCalled();
        });

        it.each([
            ['the token', 'challenge-halcyon', null],
            ['the response', null, passkeyResponse],
        ])(
            'checks the password when only %s of the passkey proof is present',
            async (_label, passkeyChallengeToken, response) => {
                await expect(
                    service.checkReauthenticationPassword(baseUser, {
                        ...input,
                        passkeyChallengeToken,
                        passkeyResponse: response,
                    })
                ).resolves.toEqual({ isPasswordChecked: true, limit: null });
                expect(argon2Compare).toHaveBeenCalledWith(
                    'plain-password',
                    'hashed-password'
                );
            }
        );

        it('answers unchecked with no limit for an account with no credential', async () => {
            userPasswordService.getCredential.mockReturnValue(null);

            await expect(
                service.checkReauthenticationPassword(baseUser, {
                    ...input,
                    password: null,
                })
            ).resolves.toEqual({ isPasswordChecked: false, limit: null });
            expect(argon2Compare).not.toHaveBeenCalled();
        });

        it('answers checked with no limit for a matching password and writes nothing', async () => {
            await expect(
                service.checkReauthenticationPassword(baseUser, input)
            ).resolves.toEqual({ isPasswordChecked: true, limit: null });
            expect(
                userPasswordService.assertPasswordAttemptAvailable
            ).toHaveBeenCalledWith(baseUser);
            expect(argon2Compare).toHaveBeenCalledWith(
                'plain-password',
                'hashed-password'
            );
            expect(
                userPasswordService.countFailedPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers checked with the attempt limit for a wrong password and writes nothing', async () => {
            argon2Compare.mockResolvedValue(false);
            userPasswordService.getPasswordAttemptLimit.mockResolvedValue(
                passwordLimit
            );

            await expect(
                service.checkReauthenticationPassword(baseUser, input)
            ).resolves.toEqual({
                isPasswordChecked: true,
                limit: passwordLimit,
            });
            expect(
                userPasswordService.countFailedPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers the attempt limit for a null password without comparing', async () => {
            userPasswordService.getPasswordAttemptLimit.mockResolvedValue(
                passwordLimit
            );

            await expect(
                service.checkReauthenticationPassword(baseUser, {
                    ...input,
                    password: null,
                })
            ).resolves.toEqual({
                isPasswordChecked: true,
                limit: passwordLimit,
            });
            expect(argon2Compare).not.toHaveBeenCalled();
        });

        it('throws the max-attempt exception without comparing when the account is locked', async () => {
            userPasswordService.assertPasswordAttemptAvailable.mockImplementation(
                () => {
                    throw new UserPasswordAttemptMaxException();
                }
            );

            await expect(
                service.checkReauthenticationPassword(baseUser, input)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
            });
            expect(argon2Compare).not.toHaveBeenCalled();
        });

        it('throws UserPasswordExpiredException when the matched password has expired', async () => {
            const expiredUser = {
                ...baseUser,
                passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
            };
            userPasswordService.getCredential.mockReturnValue({
                ...credential,
                user: expiredUser,
            });

            await expect(
                service.checkReauthenticationPassword(expiredUser, input)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
            });
        });
    });

    describe('getReauthenticationVerificationId', () => {
        const input: IUserReauthenticationInput = {
            action: EnumUserReauthenticationAction.mobileNumberAdd,
            password: null,
            method: null,
            code: null,
            backupCode: null,
            passkeyChallengeToken: null,
            passkeyResponse: null,
            otp: '123456',
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

        it('answers the id of the email code of the action for an account with neither proof', async () => {
            userVerificationService.getOneActiveReauthentication.mockResolvedValue(
                reauthenticationVerification
            );

            await expect(
                service.getReauthenticationVerificationId(
                    baseUser,
                    input,
                    false,
                    false
                )
            ).resolves.toBe('verification-halcyon');
            expect(
                userVerificationService.getOneActiveReauthentication
            ).toHaveBeenCalledWith(
                'user-halcyon',
                EnumUserReauthenticationAction.mobileNumberAdd,
                '123456'
            );
        });

        it('throws UserReauthenticationOtpRequiredException for an account with neither proof and no email code', async () => {
            await expect(
                service.getReauthenticationVerificationId(
                    baseUser,
                    { ...input, otp: null },
                    false,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpRequired,
            });
            expect(
                userVerificationService.getOneActiveReauthentication
            ).not.toHaveBeenCalled();
        });

        it('throws UserReauthenticationOtpInvalidException for a wrong, expired, or other-action email code', async () => {
            userVerificationService.getOneActiveReauthentication.mockRejectedValue(
                new UserReauthenticationOtpInvalidException()
            );

            await expect(
                service.getReauthenticationVerificationId(
                    baseUser,
                    { ...input, otp: '000000' },
                    false,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpInvalid,
            });
        });

        it.each([
            [true, false],
            [false, true],
            [true, true],
        ])(
            'answers null and reads nothing when the password is checked %s and MFA is enabled %s',
            async (isPasswordChecked, isMfaEnabled) => {
                await expect(
                    service.getReauthenticationVerificationId(
                        baseUser,
                        input,
                        isPasswordChecked,
                        isMfaEnabled
                    )
                ).resolves.toBeNull();
                expect(
                    userVerificationService.getOneActiveReauthentication
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('countFailedReauthenticationInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const authContext = buildAuthJwtAccessContext('user-halcyon');
        const passwordLimit: IUserPasswordAttemptLimit = {
            maxAttempts: 5,
            lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
        };

        beforeEach(() => {
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        });

        it.each([false, true])(
            'counts the password failure on the tx, then adds the userReauthenticationFailed entry, and answers lock %s',
            async isLocked => {
                userPasswordService.countFailedPasswordAttemptInTx.mockResolvedValue(
                    isLocked
                );

                await expect(
                    service.countFailedReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        passwordLimit
                    )
                ).resolves.toBe(isLocked);

                expect(
                    userPasswordService.countFailedPasswordAttemptInTx
                ).toHaveBeenCalledWith(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-halcyon',
                    passwordLimit
                );
                expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userReauthenticationFailed,
                        userId: 'user-halcyon',
                        createdBy: 'user-halcyon',
                    }
                );
                expect(outboxService.addInTx).toHaveBeenCalledWith(
                    tx,
                    entryEffect
                );
                expect(
                    userPasswordService.countFailedPasswordAttemptInTx
                ).toHaveBeenCalledBefore(outboxService.addInTx);
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            }
        );
    });

    describe('throwFailedReauthentication', () => {
        it('throws UserPasswordAttemptMaxException for a locking failure', () => {
            expect(() => service.throwFailedReauthentication(true)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                })
            );
        });

        it('throws UserPasswordNotMatchException for a failure below the budget', () => {
            expect(() => service.throwFailedReauthentication(false)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.passwordNotMatch,
                })
            );
        });
    });

    describe('assertReauthenticationOtpAllowed', () => {
        it('answers nothing for an account with no password and MFA off', () => {
            userPasswordService.getCredential.mockReturnValue(null);

            expect(
                service.assertReauthenticationOtpAllowed(baseUser, false)
            ).toBeUndefined();
        });

        it('throws UserReauthenticationOtpNotAllowedException for an account with a password', () => {
            userPasswordService.getCredential.mockReturnValue({
                user: baseUser,
                hashedPassword: 'hashed-password',
            });

            expect(() =>
                service.assertReauthenticationOtpAllowed(baseUser, false)
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode:
                        EnumUserStatusCodeError.reauthenticationOtpNotAllowed,
                })
            );
        });

        it('throws UserReauthenticationOtpNotAllowedException for an account with MFA on', () => {
            userPasswordService.getCredential.mockReturnValue(null);

            expect(() =>
                service.assertReauthenticationOtpAllowed(baseUser, true)
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode:
                        EnumUserStatusCodeError.reauthenticationOtpNotAllowed,
                })
            );
        });
    });

    describe('completeReauthenticationInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const authContext = buildAuthJwtAccessContext('user-halcyon');

        it('resets the password counter on the tx for a password proof and marks no code used', async () => {
            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    authContext,
                    true,
                    null,
                    false
                )
            ).resolves.toBeUndefined();

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-halcyon');
            expect(
                userVerificationService.markReauthenticationUsedInTx
            ).not.toHaveBeenCalled();
        });

        it('resets no counter for a password proof the caller carried in its own write', async () => {
            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    authContext,
                    true,
                    null,
                    true
                )
            ).resolves.toBeUndefined();

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.markReauthenticationUsedInTx
            ).not.toHaveBeenCalled();
        });

        it('marks the email code used on the tx and resets no counter for an account with neither proof', async () => {
            userVerificationService.markReauthenticationUsedInTx.mockResolvedValue(
                true
            );

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    authContext,
                    false,
                    'verification-halcyon',
                    false
                )
            ).resolves.toBeUndefined();

            expect(
                userVerificationService.markReauthenticationUsedInTx
            ).toHaveBeenCalledWith(tx, 'verification-halcyon', 'user-halcyon');
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserReauthenticationOtpInvalidException when the email code was used first', async () => {
            userVerificationService.markReauthenticationUsedInTx.mockResolvedValue(
                false
            );

            await expect(
                service.completeReauthenticationInTx(
                    tx,
                    authContext,
                    false,
                    'verification-halcyon',
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpInvalid,
            });
        });

        it('writes nothing when neither a password was checked nor a code was read', async () => {
            await service.completeReauthenticationInTx(
                tx,
                authContext,
                false,
                null,
                false
            );

            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.markReauthenticationUsedInTx
            ).not.toHaveBeenCalled();
        });
    });
});
