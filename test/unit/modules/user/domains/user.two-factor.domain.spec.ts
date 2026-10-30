import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
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
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { UserTwoFactorCache } from '@modules/user/caches/user.two-factor.cache';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import type {
    IUser,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';

describe('UserTwoFactorDomain', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();
    const userTwoFactorCache: MockProxy<UserTwoFactorCache> =
        mock<UserTwoFactorCache>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserTwoFactorDomain;

    const tx = {} as IDatabaseTransactionClient;

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

    const verifiedResult: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.maxAttempt': 5,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorDomain,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: AuthTwoFactorUtil, useValue: authTwoFactorUtil },
                { provide: UserTwoFactorCache, useValue: userTwoFactorCache },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserTwoFactorDomain);
    });

    describe('getOneForLoginVerify', () => {
        it('returns the active verified user with two-factor ready to verify', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                messagePath: 'user.error.emailNotVerified',
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });

        it('throws AuthTwoFactorRequiredSetupException when setup is still pending', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, requiredSetup: true },
            });

            await expect(
                domain.getOneForLoginVerify('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                messagePath: 'auth.error.twoFactorRequiredSetup',
            });
        });
    });

    describe('getOneForLoginSetup', () => {
        const pendingUser: IUser = {
            ...baseUser,
            twoFactor: {
                ...baseTwoFactor,
                requiredSetup: true,
                pendingSecret: 'pending-secret',
            },
        };

        it('returns the user and its pending secret when setup was required', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(pendingUser);

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).resolves.toEqual({
                user: pendingUser,
                pendingSecret: 'pending-secret',
            });
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                status: EnumUserStatus.inactive,
            });

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
            });
        });

        it('throws UserEmailNotVerifiedException when the user is not verified', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                isVerified: false,
            });

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            });

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
        });

        it('throws AuthTwoFactorNotRequiredSetupException when setup was not required', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                messagePath: 'auth.error.twoFactorNotRequiredSetup',
            });
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...pendingUser,
                twoFactor: {
                    ...baseTwoFactor,
                    requiredSetup: true,
                    pendingSecret: null,
                },
            });

            await expect(
                domain.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
        });
    });

    describe('verify', () => {
        const codeInput = {
            method: EnumAuthTwoFactorMethod.code,
            code: ' 123456 ',
            backupCode: null,
        };
        const backupInput = {
            method: EnumAuthTwoFactorMethod.backupCodes,
            code: null,
            backupCode: ' backup-one ',
        };

        beforeEach(() => {
            userTwoFactorCache.getTwoFactorLockTtlInMs.mockResolvedValue(0);
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(1);
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.verifyCode.mockReturnValue(true);
        });

        it('verifies the trimmed code against the decrypted secret and resets the attempt', async () => {
            await expect(domain.verify(baseUser, codeInput)).resolves.toEqual(
                verifiedResult
            );

            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-secret',
                'user-quartz'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'plain-secret',
                '123456'
            );
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith('user-quartz');
        });

        it('returns the stored backup codes without the matched one for a backup code', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: true,
                index: 0,
            });

            await expect(domain.verify(baseUser, backupInput)).resolves.toEqual(
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    newBackupCodes: ['hash-two'],
                }
            );
            expect(authTwoFactorUtil.verifyBackupCode).toHaveBeenCalledWith(
                ['hash-one', 'hash-two'],
                'backup-one'
            );
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException with the remaining seconds rounded up while locked', async () => {
            userTwoFactorCache.getTwoFactorLockTtlInMs.mockResolvedValue(1500);

            const call = domain.verify(baseUser, codeInput);

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            await expect(call).rejects.toMatchObject({
                messageProperties: { retryAfterSeconds: 2 },
            });
            expect(
                userTwoFactorRepository.incrementAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorMethodRequiredException when no method is given', async () => {
            await expect(
                domain.verify(baseUser, { ...codeInput, method: null })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
            });
            expect(
                userTwoFactorRepository.incrementAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            await expect(
                domain.verify({ ...baseUser, twoFactor: null }, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
        });

        it('re-checks the lock a parallel request set when the count is below a multiple of the max', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(3);
            userTwoFactorCache.getTwoFactorLockTtlInMs
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(3000);

            await expect(
                domain.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            expect(userTwoFactorCache.setTwoFactorLock).not.toHaveBeenCalled();
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
        });

        it('locks with the count and throws on a multiple of the max', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(5);
            userTwoFactorCache.getTwoFactorLockTtlInMs
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(30000);

            const call = domain.verify(baseUser, codeInput);

            await expect(call).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            await expect(call).rejects.toMatchObject({
                messageProperties: { retryAfterSeconds: 30 },
            });
            expect(userTwoFactorCache.setTwoFactorLock).toHaveBeenCalledWith({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, attempt: 5 },
            });
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
        });

        it('fails the request when the lock write fails', async () => {
            const failure = new Error('redis down');
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(5);
            userTwoFactorCache.setTwoFactorLock.mockRejectedValue(failure);

            await expect(domain.verify(baseUser, codeInput)).rejects.toBe(
                failure
            );
        });

        it('locks after the max attempt and a later verify of any flow throws AuthTwoFactorAttemptTemporaryLockException', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(5);
            userTwoFactorCache.getTwoFactorLockTtlInMs
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(30000);
            await expect(
                domain.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });

            userTwoFactorCache.getTwoFactorLockTtlInMs.mockResolvedValue(30000);

            await expect(
                domain.verifySetupCode(baseUser, 'pending-secret', '123456')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            await expect(
                domain.verify(baseUser, backupInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
            expect(authTwoFactorUtil.verifyBackupCode).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException without a reset when the code does not match', async () => {
            authTwoFactorUtil.verifyCode.mockReturnValue(false);

            await expect(
                domain.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException when the chosen credential is blank', async () => {
            await expect(
                domain.verify(baseUser, { ...codeInput, code: '   ' })
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(authTwoFactorUtil.verifyCode).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException when the user has no backup codes left', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, backupCodes: [] },
            };

            await expect(
                domain.verify(user, backupInput)
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(authTwoFactorUtil.verifyBackupCode).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException when the backup code matches none', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: false,
                index: -1,
            });

            await expect(
                domain.verify(baseUser, backupInput)
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
        });

        it('throws AuthTwoFactorSecretUnavailableException when the user has no confirmed secret', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, secret: null },
            };

            await expect(domain.verify(user, codeInput)).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('reports a secret that fails to decrypt and throws AuthTwoFactorSecretUnavailableException', async () => {
            const failure = new HelperDecryptFailedException();
            const mapped = new AuthTwoFactorSecretUnavailableException();
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(mapped);

            await expect(domain.verify(baseUser, codeInput)).rejects.toBe(
                mapped
            );
            expect(authTwoFactorUtil.toDecryptException).toHaveBeenCalledWith(
                failure
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(
                failure
            );
        });

        it('wraps an unmapped decrypt error in AppUnknownException', async () => {
            const failure = new Error('boom');
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(null);

            await expect(
                domain.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('verifySetupCode', () => {
        beforeEach(() => {
            userTwoFactorCache.getTwoFactorLockTtlInMs.mockResolvedValue(0);
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(1);
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-pending');
            authTwoFactorUtil.verifyCode.mockReturnValue(true);
        });

        it('verifies the trimmed code against the decrypted pending secret and resets the attempt', async () => {
            await expect(
                domain.verifySetupCode(
                    baseUser,
                    'encrypted-pending',
                    ' 654321 '
                )
            ).resolves.toBeUndefined();

            expect(authTwoFactorUtil.decryptSecret).toHaveBeenCalledWith(
                'encrypted-pending',
                'user-quartz'
            );
            expect(authTwoFactorUtil.verifyCode).toHaveBeenCalledWith(
                'plain-pending',
                '654321'
            );
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith('user-quartz');
        });

        it('throws AuthTwoFactorAttemptTemporaryLockException while locked', async () => {
            userTwoFactorCache.getTwoFactorLockTtlInMs.mockResolvedValue(2000);

            await expect(
                domain.verifySetupCode(baseUser, 'encrypted-pending', '654321')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            expect(
                userTwoFactorRepository.incrementAttempt
            ).not.toHaveBeenCalled();
        });

        it('locks and throws on a multiple of the max attempt', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(5);
            userTwoFactorCache.getTwoFactorLockTtlInMs
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(30000);

            await expect(
                domain.verifySetupCode(baseUser, 'encrypted-pending', '654321')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
            });
            expect(userTwoFactorCache.setTwoFactorLock).toHaveBeenCalledWith({
                ...baseUser,
                twoFactor: { ...baseTwoFactor, attempt: 5 },
            });
        });

        it('locks a user row without two-factor data as given', async () => {
            const user = { ...baseUser, twoFactor: null };
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(5);
            userTwoFactorCache.getTwoFactorLockTtlInMs
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(60000);

            await expect(
                domain.verifySetupCode(user, 'encrypted-pending', '654321')
            ).rejects.toMatchObject({
                messageProperties: { retryAfterSeconds: 60 },
            });
            expect(userTwoFactorCache.setTwoFactorLock).toHaveBeenCalledWith(
                user
            );
        });

        it('throws AuthTwoFactorInvalidException without a reset when the code does not match', async () => {
            authTwoFactorUtil.verifyCode.mockReturnValue(false);

            await expect(
                domain.verifySetupCode(baseUser, 'encrypted-pending', '654321')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).not.toHaveBeenCalled();
        });

        it('reports a pending secret that fails to decrypt and throws AuthTwoFactorSecretUnavailableException', async () => {
            const failure = new HelperDecryptFailedException();
            const mapped = new AuthTwoFactorSecretUnavailableException();
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(mapped);

            await expect(
                domain.verifySetupCode(baseUser, 'encrypted-pending', '654321')
            ).rejects.toBe(mapped);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                failure
            );
        });
    });

    describe('setup', () => {
        it('generates a secret and answers it with its encrypted form and key URI', async () => {
            authTwoFactorUtil.generateSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.encryptSecret.mockReturnValue('encrypted-secret');
            authTwoFactorUtil.createKeyUri.mockReturnValue('otpauth://totp/x');

            await expect(domain.setup(baseUser)).resolves.toEqual({
                secret: 'plain-secret',
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/x',
            });
            expect(authTwoFactorUtil.encryptSecret).toHaveBeenCalledWith(
                'plain-secret',
                'user-quartz'
            );
            expect(authTwoFactorUtil.createKeyUri).toHaveBeenCalledWith(
                'quartz@example.com',
                'plain-secret'
            );
        });
    });

    describe('clearLock', () => {
        it('deletes the lock of the user', async () => {
            await domain.clearLock(baseUser);

            expect(userTwoFactorCache.deleteTwoFactorLock).toHaveBeenCalledWith(
                baseUser
            );
        });
    });

    describe('saveSetup', () => {
        it('stores the encrypted pending secret', async () => {
            await domain.saveSetup('user-quartz', 'encrypted-secret');

            expect(userTwoFactorRepository.setupTwoFactor).toHaveBeenCalledWith(
                'user-quartz',
                'encrypted-secret'
            );
        });
    });

    describe('saveSetupConsumingBackupCode', () => {
        it('stores the pending secret and consumes the verified backup code', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCode.mockResolvedValue(
                true
            );

            await domain.saveSetupConsumingBackupCode(
                baseUser,
                'encrypted-secret',
                verifiedResult
            );

            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCode
            ).toHaveBeenCalledWith(
                'user-quartz',
                'encrypted-secret',
                verifiedResult,
                baseTwoFactor.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the backup code was already consumed', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCode.mockResolvedValue(
                false
            );

            await expect(
                domain.saveSetupConsumingBackupCode(
                    baseUser,
                    'encrypted-secret',
                    verifiedResult
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.setupTwoFactorConsumingBackupCode.mockResolvedValue(
                true
            );

            await domain.saveSetupConsumingBackupCode(
                { ...baseUser, twoFactor: null },
                'encrypted-secret',
                verifiedResult
            );

            expect(
                userTwoFactorRepository.setupTwoFactorConsumingBackupCode
            ).toHaveBeenCalledWith(
                'user-quartz',
                'encrypted-secret',
                verifiedResult,
                []
            );
        });
    });

    describe('getPendingSecret', () => {
        it('returns the pending secret', () => {
            const user = {
                ...baseUser,
                twoFactor: {
                    ...baseTwoFactor,
                    enabled: false,
                    pendingSecret: 'pending-secret',
                },
            };

            expect(domain.getPendingSecret(user)).toBe('pending-secret');
        });

        it('throws AuthTwoFactorAlreadyEnabledException when already enabled with no pending secret', () => {
            expect(() => domain.getPendingSecret(baseUser)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                    messagePath: 'auth.error.twoFactorAlreadyEnabled',
                })
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when there is no pending secret and it is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => domain.getPendingSecret(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                    messagePath: 'auth.error.twoFactorSetupRequired',
                })
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when the user has no two-factor row', () => {
            expect(() =>
                domain.getPendingSecret({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                })
            );
        });
    });

    describe('enableTwoFactor', () => {
        it('confirms the pending authenticator and returns the plain backup codes', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.enableTwoFactor.mockResolvedValue({
                ...baseTwoFactor,
                enabled: true,
            });

            await expect(
                domain.enableTwoFactor('user-quartz', 'pending-secret')
            ).resolves.toEqual(['CODE1']);
            expect(
                userTwoFactorRepository.enableTwoFactor
            ).toHaveBeenCalledWith('user-quartz', 'pending-secret', ['hash1']);
        });

        it('rethrows an AppBaseException raised while enabling', async () => {
            const failure = new UserEmailNotVerifiedException();
            authTwoFactorUtil.generateBackupCodes.mockImplementation(() => {
                throw failure;
            });

            await expect(
                domain.enableTwoFactor('user-quartz', 'pending-secret')
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error raised while enabling', async () => {
            const error = new Error('boom');
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);

            const call = domain.enableTwoFactor('user-quartz', 'pending');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('replaces the backup codes and returns the plain ones', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1', 'CODE2'],
                hashes: ['hash1', 'hash2'],
            });

            await expect(
                domain.regenerateTwoFactorBackupCodes('user-quartz')
            ).resolves.toEqual(['CODE1', 'CODE2']);
            expect(
                userTwoFactorRepository.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith('user-quartz', ['hash1', 'hash2']);
        });

        it('rethrows an AppBaseException raised while regenerating', async () => {
            const failure = new UserEmailNotVerifiedException();
            authTwoFactorUtil.generateBackupCodes.mockImplementation(() => {
                throw failure;
            });

            await expect(
                domain.regenerateTwoFactorBackupCodes('user-quartz')
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error raised while regenerating', async () => {
            const error = new Error('boom');
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockRejectedValue(
                error
            );

            await expect(
                domain.regenerateTwoFactorBackupCodes('user-quartz')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('assertEnabled', () => {
        it('passes when two-factor is enabled', () => {
            expect(() => domain.assertEnabled(baseUser)).not.toThrow();
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => domain.assertEnabled(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                    messagePath: 'auth.error.twoFactorNotEnabled',
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                domain.assertEnabled({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });
    });

    describe('getBackupCodeForSetup', () => {
        it('returns null when two-factor is not enabled', () => {
            expect(
                domain.getBackupCodeForSetup(
                    { ...baseUser, twoFactor: null },
                    'backup-code'
                )
            ).toBeNull();
        });

        it('returns the backup code when two-factor is enabled', () => {
            expect(domain.getBackupCodeForSetup(baseUser, 'backup-code')).toBe(
                'backup-code'
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when two-factor is enabled and no backup code is given', () => {
            expect(() => domain.getBackupCodeForSetup(baseUser, null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                    messagePath: 'auth.error.twoFactorBackupCodeRequired',
                })
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when the backup code is blank', () => {
            expect(() => domain.getBackupCodeForSetup(baseUser, '')).toThrow(
                expect.objectContaining({
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                })
            );
        });
    });

    describe('disableInTx', () => {
        it('disables two-factor on the given transaction', async () => {
            await domain.disableInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.disableTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('resetByAdminInTx', () => {
        it('resets two-factor on the given transaction', async () => {
            await domain.resetByAdminInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorByAdminInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('recordVerificationInTx', () => {
        it('records the verified check on the given transaction', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await expect(
                domain.recordVerificationInTx(tx, baseUser, verifiedResult)
            ).resolves.toBeUndefined();
            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                verifiedResult,
                baseTwoFactor.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the stored codes moved on', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(
                false
            );

            await expect(
                domain.recordVerificationInTx(tx, baseUser, verifiedResult)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await domain.recordVerificationInTx(
                tx,
                { ...baseUser, twoFactor: null },
                verifiedResult
            );

            expect(
                userTwoFactorRepository.verifyTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', verifiedResult, []);
        });
    });

    describe('recordVerification', () => {
        it('records the verified check', async () => {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);

            await expect(
                domain.recordVerification(baseUser, verifiedResult)
            ).resolves.toBeUndefined();
            expect(
                userTwoFactorRepository.verifyTwoFactor
            ).toHaveBeenCalledWith(
                'user-quartz',
                verifiedResult,
                baseTwoFactor.backupCodes
            );
        });

        it('throws AuthTwoFactorInvalidException when the stored codes moved on', async () => {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(false);

            await expect(
                domain.recordVerification(baseUser, verifiedResult)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);

            await domain.recordVerification(
                { ...baseUser, twoFactor: null },
                verifiedResult
            );

            expect(
                userTwoFactorRepository.verifyTwoFactor
            ).toHaveBeenCalledWith('user-quartz', verifiedResult, []);
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

    describe('getEnabledTwoFactor', () => {
        it('returns the two-factor row when two-factor is enabled', () => {
            expect(domain['getEnabledTwoFactor'](baseUser)).toBe(baseTwoFactor);
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => domain['getEnabledTwoFactor'](user)).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                domain['getEnabledTwoFactor']({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });
    });
});
