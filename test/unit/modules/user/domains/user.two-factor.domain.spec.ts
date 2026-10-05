import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type {
    IAuthToken,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserTwoFactorDomain', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userLoginDomain: MockProxy<UserLoginDomain> = mock<UserLoginDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const authCache: MockProxy<AuthCache> = mock<AuthCache>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let domain: UserTwoFactorDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userVerifyTwoFactor,
        metadata: {},
        onError: false,
    };

    const baseTwoFactor: TwoFactor = {
        id: 'two-factor-quartz',
        userId: 'user-quartz',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one', 'hash-two'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-quartz',
        name: 'Quartz Cole',
        username: 'quartzCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'quartz@example.com',
        roleId: 'role-quartz',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-quartz',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-quartz',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: baseTwoFactor,
    };

    const verifiedResult: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-quartz',
        device: { fingerprint: 'device-quartz' },
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        activityLogDomain.prepare.mockReturnValue(event);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorDomain,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: UserLoginDomain, useValue: userLoginDomain },
                { provide: UserUtil, useValue: userUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: AuthCache, useValue: authCache },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(UserTwoFactorDomain);
    });

    describe('loginVerifyTwoFactor', () => {
        it('verifies the challenge and returns fresh tokens', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            userLoginDomain.createTokenAndSession.mockResolvedValue(tokens);

            await expect(
                domain.loginVerifyTwoFactor('challenge-token', {
                    code: '123456',
                })
            ).resolves.toBe(tokens);
            expect(
                userLoginDomain.recordTwoFactorVerification
            ).toHaveBeenCalledWith(expect.any(Object), verifiedResult);
            expect(authCache.clearChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws AuthTwoFactorChallengeInvalidException when the challenge is missing', async () => {
            authCache.getChallenge.mockResolvedValue(null);

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid
                    ],
                messagePath: 'auth.error.twoFactorChallengeInvalid',
            });
        });

        it('throws UserNotFoundException when the challenge user no longer exists', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailNotVerified
                    ],
                messagePath: 'user.error.emailNotVerified',
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('throws AuthTwoFactorRequiredSetupException when setup is still pending', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, requiredSetup: true },
            });

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorRequiredSetup
                    ],
                messagePath: 'auth.error.twoFactorRequiredSetup',
            });
        });

        it('rethrows an AppBaseException raised while finalizing the login', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const error = new UserNotFoundException();
            userLoginDomain.recordTwoFactorVerification.mockRejectedValue(
                error
            );

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while finalizing the login', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const error = new Error('boom');
            userLoginDomain.recordTwoFactorVerification.mockRejectedValue(
                error
            );

            const call = domain.loginVerifyTwoFactor('challenge-token', {
                code: '123456',
            });

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('loginSetupTwoFactor', () => {
        const pendingUser = {
            ...baseUser,
            twoFactor: {
                ...baseTwoFactor,
                requiredSetup: true,
                pendingSecret: 'pending-secret',
            },
        };

        it('confirms the pending authenticator, returns backup codes, and stages the event in order', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(pendingUser);
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1', 'CODE2'],
                hashes: ['hash1', 'hash2'],
            });
            const callOrder: string[] = [];
            userTwoFactorRepository.enableTwoFactor.mockImplementation(
                async () => {
                    callOrder.push('enableTwoFactor');
                    return { ...baseTwoFactor, enabled: true };
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                domain.loginSetupTwoFactor('challenge-token', '123456')
            ).resolves.toEqual(['CODE1', 'CODE2']);
            expect(
                userLoginDomain.handleTwoFactorSetupValidation
            ).toHaveBeenCalledWith(pendingUser, 'pending-secret', '123456');
            expect(
                userTwoFactorRepository.enableTwoFactor
            ).toHaveBeenCalledWith(pendingUser.id, 'pending-secret', [
                'hash1',
                'hash2',
            ]);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['enableTwoFactor', 'stagePrepared']);
        });

        it('throws AuthTwoFactorChallengeInvalidException when the challenge is missing', async () => {
            authCache.getChallenge.mockResolvedValue(null);

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid
                    ],
                messagePath: 'auth.error.twoFactorChallengeInvalid',
            });
        });

        it('throws UserNotFoundException when the challenge user no longer exists', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
                twoFactor: { ...baseTwoFactor, requiredSetup: true },
            });

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
                twoFactor: { ...baseTwoFactor, requiredSetup: true },
            });

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailNotVerified
                    ],
                messagePath: 'user.error.emailNotVerified',
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    requiredSetup: true,
                },
            });

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('throws AuthTwoFactorNotRequiredSetupException when setup was not required', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, requiredSetup: false },
            });

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotRequiredSetup
                    ],
                messagePath: 'auth.error.twoFactorNotRequiredSetup',
            });
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    requiredSetup: true,
                    pendingSecret: null,
                },
            });

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSetupRequired
                    ],
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
        });

        it('rethrows an AppBaseException raised while enabling two-factor', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(pendingUser);
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new UserNotFoundException();
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while enabling two-factor', async () => {
            authCache.getChallenge.mockResolvedValue(challenge);
            userRepository.findOneWithRoleById.mockResolvedValue(pendingUser);
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new Error('boom');
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);

            const call = domain.loginSetupTwoFactor(
                'challenge-token',
                '123456'
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('getTwoFactorStatus', () => {
        it('returns the two-factor row on the user', () => {
            const user = baseUser;

            expect(domain.getTwoFactorStatus(user)).toBe(user.twoFactor);
        });
    });

    describe('setupTwoFactor', () => {
        it('starts a fresh setup and stages the event in order when two-factor is not enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
                encryptedSecret: 'encrypted-secret',
            });
            const callOrder: string[] = [];
            userTwoFactorRepository.setupTwoFactor.mockImplementation(
                async () => {
                    callOrder.push('setupTwoFactor');
                    return { ...baseTwoFactor, enabled: false };
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await domain.setupTwoFactor(user, null);

            expect(result).toEqual({
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            });
            expect(userTwoFactorRepository.setupTwoFactor).toHaveBeenCalledWith(
                user.id,
                'encrypted-secret'
            );
            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCode
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: user.id,
                createdBy: user.id,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['setupTwoFactor', 'stagePrepared']);
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when enabled and no backup code is given', async () => {
            const user = baseUser;

            const call = domain.setupTwoFactor(user, null);

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired
                    ],
                messagePath: 'auth.error.twoFactorBackupCodeRequired',
            });
        });

        it('consumes the backup code when re-setting up while enabled', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
                encryptedSecret: 'encrypted-secret',
            });
            userTwoFactorRepository.setupTwoFactorConsumingBackupCode.mockResolvedValue(
                true
            );

            await domain.setupTwoFactor(user, 'BACKUP1');

            expect(
                userLoginDomain.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'BACKUP1',
            });
            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCode
            ).toHaveBeenCalledWith(
                user.id,
                'encrypted-secret',
                verifiedResult,
                user.twoFactor!.backupCodes
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws AuthTwoFactorInvalidException when the backup code was already consumed', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
                encryptedSecret: 'encrypted-secret',
            });
            userTwoFactorRepository.setupTwoFactorConsumingBackupCode.mockResolvedValue(
                false
            );

            const call = domain.setupTwoFactor(user, 'BACKUP1');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('rethrows an AppBaseException raised while setting up', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            const error = new UserNotFoundException();
            authTwoFactorDomain.setupTwoFactor.mockRejectedValue(error);

            const call = domain.setupTwoFactor(user, null);

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while setting up', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };
            const error = new Error('boom');
            authTwoFactorDomain.setupTwoFactor.mockRejectedValue(error);

            const call = domain.setupTwoFactor(user, null);

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('enableTwoFactor', () => {
        it('confirms the pending authenticator, returns backup codes, and stages the event in order', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: 'pending-secret',
                },
            };
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const callOrder: string[] = [];
            userTwoFactorRepository.enableTwoFactor.mockImplementation(
                async () => {
                    callOrder.push('enableTwoFactor');
                    return { ...baseTwoFactor, enabled: true };
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                domain.enableTwoFactor(user, '123456')
            ).resolves.toEqual(['CODE1']);
            expect(
                userLoginDomain.handleTwoFactorSetupValidation
            ).toHaveBeenCalledWith(user, 'pending-secret', '123456');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['enableTwoFactor', 'stagePrepared']);
        });

        it('throws AuthTwoFactorAlreadyEnabledException when already enabled with no pending secret', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: true,
                    pendingSecret: null,
                },
            };

            const call = domain.enableTwoFactor(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAlreadyEnabled
                    ],
                messagePath: 'auth.error.twoFactorAlreadyEnabled',
            });
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret and it is not enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: null,
                },
            };

            const call = domain.enableTwoFactor(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSetupRequired
                    ],
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
        });

        it('rethrows an AppBaseException raised while enabling', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: 'pending-secret',
                },
            };
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new UserNotFoundException();
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);

            const call = domain.enableTwoFactor(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while enabling', async () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: 'pending-secret',
                },
            };
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new Error('boom');
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);

            const call = domain.enableTwoFactor(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('disableTwoFactor', () => {
        it('disables two-factor and revokes active sessions', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );

            await domain.disableTwoFactor(user, { code: '123456' });

            expect(
                userTwoFactorRepository.disableTwoFactorInTx
            ).toHaveBeenCalledWith(tx, user.id);
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                user.id,
                now
            );
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                user.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            const call = domain.disableTwoFactor(user, { code: '123456' });

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.disableTwoFactor(user, { code: '123456' });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.disableTwoFactor(user, { code: '123456' });

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('regenerates fresh backup codes and stages the event in order', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1', 'CODE2'],
                hashes: ['hash1', 'hash2'],
            });
            const callOrder: string[] = [];
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockImplementation(
                async () => {
                    callOrder.push('regenerateTwoFactorBackupCodes');
                    return baseTwoFactor;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                domain.regenerateTwoFactorBackupCodes(user, '123456')
            ).resolves.toEqual(['CODE1', 'CODE2']);
            expect(
                userLoginDomain.handleTwoFactorValidation
            ).toHaveBeenCalledWith(user, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            });
            expect(
                userTwoFactorRepository.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith(user.id, ['hash1', 'hash2']);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual([
                'regenerateTwoFactorBackupCodes',
                'stagePrepared',
            ]);
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            const call = domain.regenerateTwoFactorBackupCodes(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('rethrows an AppBaseException raised while regenerating', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new UserNotFoundException();
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockRejectedValue(
                error
            );

            const call = domain.regenerateTwoFactorBackupCodes(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while regenerating', async () => {
            const user = baseUser;
            userLoginDomain.handleTwoFactorValidation.mockResolvedValue(
                verifiedResult
            );
            authTwoFactorDomain.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            const error = new Error('boom');
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockRejectedValue(
                error
            );

            const call = domain.regenerateTwoFactorBackupCodes(user, '123456');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('resetTwoFactorByAdmin', () => {
        it('resets two-factor, revokes sessions, stages both events in order, and notifies the user', async () => {
            const user = baseUser;
            userRepository.findOneWithRoleById.mockResolvedValue(user);
            const actorMetadata = { userId: 'user-quartz' };
            const targetMetadata = { actorUserId: 'admin-quartz' };
            userUtil.mapActivityLogActorMetadata.mockReturnValue(actorMetadata);
            userUtil.mapActivityLogTargetMetadata.mockReturnValue(
                targetMetadata
            );
            const actorEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: {},
                onError: false,
            };
            const targetEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorEvent)
                .mockReturnValueOnce(targetEvent);
            const callOrder: string[] = [];
            sessionDomain.purgeLoginsByUser.mockImplementation(async () => {
                callOrder.push('purgeLoginsByUser');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendResetTwoFactorByAdmin.mockImplementation(
                async () => {
                    callOrder.push('sendResetTwoFactorByAdmin');
                }
            );

            await domain.resetTwoFactorByAdmin('user-quartz', 'admin-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorByAdminInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'admin-quartz',
                now
            );
            expect(authCache.clearLockTwoFactorAttempt).toHaveBeenCalledWith(
                user
            );
            expect(sessionDomain.purgeLoginsByUser).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.adminUserResetTwoFactor,
                metadata: actorMetadata,
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                userId: 'user-quartz',
                createdBy: 'admin-quartz',
                metadata: targetMetadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
                targetEvent,
            ]);
            expect(
                notificationQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith('user-quartz', 'admin-quartz');
            expect(callOrder).toEqual([
                'purgeLoginsByUser',
                'stagePrepared',
                'sendResetTwoFactorByAdmin',
            ]);
        });

        it('throws UserNotSelfException when the admin targets themselves', async () => {
            const call = domain.resetTwoFactorByAdmin(
                'admin-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notSelf,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notSelf],
                messagePath: 'user.error.notSelf',
            });
        });

        it('throws UserNotFoundException when the target user does not exist', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            const call = domain.resetTwoFactorByAdmin(
                'user-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserBlockedInvalidException when the target user is blocked', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.blocked,
            });

            const call = domain.resetTwoFactorByAdmin(
                'user-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedInvalid
                    ],
                messagePath: 'user.error.blockedInvalid',
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            const call = domain.resetTwoFactorByAdmin(
                'user-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resetTwoFactorByAdmin(
                'user-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resetTwoFactorByAdmin(
                'user-quartz',
                'admin-quartz'
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('createDisabledInTx', () => {
        it('delegates to the repository', async () => {
            const disabled = { ...baseTwoFactor, enabled: false };
            userTwoFactorRepository.createDisabledInTx.mockResolvedValue(
                disabled
            );

            await expect(
                domain.createDisabledInTx(tx, 'user-quartz', 'admin-quartz')
            ).resolves.toBe(disabled);
            expect(
                userTwoFactorRepository.createDisabledInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 'admin-quartz');
        });
    });
});
