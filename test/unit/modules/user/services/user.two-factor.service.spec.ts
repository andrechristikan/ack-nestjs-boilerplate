import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import type {
    IUser,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserTwoFactorService', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserTwoFactorService;

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
        lastUsedStep: null,
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
            isImmutable: false,
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
                UserTwoFactorService,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: AuthTwoFactorUtil, useValue: authTwoFactorUtil },
                { provide: SentryService, useValue: sentryService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: UserQueue, useValue: userQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(UserTwoFactorService);
    });

    describe('getOneForLoginVerify', () => {
        it('returns the active verified user with two-factor ready to verify', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForLoginVerify('user-quartz')
            ).resolves.toBe(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForLoginVerify('user-quartz')
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
                service.getOneForLoginVerify('user-quartz')
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
                service.getOneForLoginVerify('user-quartz')
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
                service.getOneForLoginVerify('user-quartz')
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
                service.getOneForLoginVerify('user-quartz')
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
                service.getOneForLoginSetup('user-quartz')
            ).resolves.toEqual({
                user: pendingUser,
                pendingSecret: 'pending-secret',
            });
        });

        it('throws UserNotFoundException when the user no longer exists', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneForLoginSetup('user-quartz')
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
                service.getOneForLoginSetup('user-quartz')
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
                service.getOneForLoginSetup('user-quartz')
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
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
        });

        it('throws AuthTwoFactorNotRequiredSetupException when setup was not required', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.getOneForLoginSetup('user-quartz')
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
                service.getOneForLoginSetup('user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
        });
    });

    describe('countAttempt', () => {
        const lockoutStages: IActivityLogStageInput<EnumActivityLogAction>[] = [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-quartz',
                createdBy: 'user-quartz',
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-quartz',
                createdBy: 'user-quartz',
            },
        ];

        it('returns a counted attempt with no lockout stages within the budget', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(2);

            await expect(service.countAttempt(baseUser)).resolves.toEqual({
                isAttemptCounted: true,
                lockoutStages: [],
            });
            expect(
                userTwoFactorRepository.incrementAttempt
            ).toHaveBeenCalledWith('user-quartz', 5);
            expect(userQueue.lockout).not.toHaveBeenCalled();
            expect(userUtil.buildTwoFactorLockoutStages).not.toHaveBeenCalled();
        });

        it('returns an uncounted attempt with the lockout stages and enqueues the lockout when the guarded increment finds the budget spent', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(null);
            userUtil.buildTwoFactorLockoutStages.mockReturnValue(lockoutStages);

            await expect(service.countAttempt(baseUser)).resolves.toEqual({
                isAttemptCounted: false,
                lockoutStages,
            });
            expect(userQueue.lockout).toHaveBeenCalledOnce();
            expect(userQueue.lockout).toHaveBeenCalledWith('user-quartz');
            expect(userQueue.lockout).toHaveBeenCalledAfter(
                userTwoFactorRepository.incrementAttempt
            );
            expect(userUtil.buildTwoFactorLockoutStages).toHaveBeenCalledWith(
                'user-quartz'
            );
        });
    });

    describe('assertAttemptCounted', () => {
        it('passes when the attempt was counted', () => {
            expect(() => service.assertAttemptCounted(true)).not.toThrow();
        });

        it('throws AuthTwoFactorAttemptMaxException when the budget is spent', () => {
            expect(() => service.assertAttemptCounted(false)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorAttemptMax
                        ],
                    messagePath: 'auth.error.twoFactorAttemptMax',
                })
            );
        });
    });

    describe('getProvidedMethod', () => {
        it('returns the given method', () => {
            expect(
                service.getProvidedMethod(EnumAuthTwoFactorMethod.backupCodes)
            ).toBe(EnumAuthTwoFactorMethod.backupCodes);
        });

        it('throws AuthTwoFactorMethodRequiredException for a null method', () => {
            expect(() => service.getProvidedMethod(null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorMethodRequired
                        ],
                    messagePath: 'auth.error.twoFactorMethodRequired',
                })
            );
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
            userTwoFactorRepository.markTotpUsed.mockResolvedValue(true);
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-secret');
            authTwoFactorUtil.verifyCode.mockReturnValue(58123456);
        });

        it('verifies the trimmed code against the decrypted secret and resets the attempt', async () => {
            await expect(service.verify(baseUser, codeInput)).resolves.toEqual(
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
            expect(userTwoFactorRepository.markTotpUsed).toHaveBeenCalledWith(
                'user-quartz',
                58123456
            );
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith('user-quartz');
            expect(
                userTwoFactorRepository.incrementAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException without a reset when the TOTP step was already used', async () => {
            userTwoFactorRepository.markTotpUsed.mockResolvedValue(false);

            await expect(
                service.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).not.toHaveBeenCalled();
        });

        it('marks no TOTP step for a backup code', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: true,
                index: 0,
            });

            await service.verify(baseUser, backupInput);

            expect(userTwoFactorRepository.markTotpUsed).not.toHaveBeenCalled();
        });

        it('returns the stored backup codes without the matched one for a backup code', async () => {
            authTwoFactorUtil.verifyBackupCode.mockReturnValue({
                isValid: true,
                index: 0,
            });

            await expect(
                service.verify(baseUser, backupInput)
            ).resolves.toEqual({
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: ['hash-two'],
            });
            expect(authTwoFactorUtil.verifyBackupCode).toHaveBeenCalledWith(
                ['hash-one', 'hash-two'],
                'backup-one'
            );
        });

        it('throws AuthTwoFactorMethodRequiredException when no method is given', async () => {
            await expect(
                service.verify(baseUser, { ...codeInput, method: null })
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorMethodRequired,
            });
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', async () => {
            await expect(
                service.verify({ ...baseUser, twoFactor: null }, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
            });
        });

        it('throws AuthTwoFactorInvalidException without a reset when the code does not match', async () => {
            authTwoFactorUtil.verifyCode.mockReturnValue(null);

            await expect(
                service.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(userTwoFactorRepository.markTotpUsed).not.toHaveBeenCalled();
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException when the chosen credential is blank', async () => {
            await expect(
                service.verify(baseUser, { ...codeInput, code: '   ' })
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
                service.verify(user, backupInput)
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
                service.verify(baseUser, backupInput)
            ).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
        });

        it('throws AuthTwoFactorSecretUnavailableException when the user has no confirmed secret', async () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, secret: null },
            };

            await expect(service.verify(user, codeInput)).rejects.toMatchObject(
                {
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorSecretUnavailable
                        ],
                    messagePath: 'auth.error.twoFactorSecretUnavailable',
                }
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('reports a secret that fails to decrypt and throws AuthTwoFactorSecretUnavailableException', async () => {
            const failure = new HelperDecryptFailedException();
            const mapped = new AuthTwoFactorSecretUnavailableException();
            authTwoFactorUtil.decryptSecret.mockImplementation(() => {
                throw failure;
            });
            authTwoFactorUtil.toDecryptException.mockReturnValue(mapped);

            await expect(service.verify(baseUser, codeInput)).rejects.toBe(
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
                service.verify(baseUser, codeInput)
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('verifySetupCode', () => {
        beforeEach(() => {
            userTwoFactorRepository.markTotpUsed.mockResolvedValue(true);
            authTwoFactorUtil.decryptSecret.mockReturnValue('plain-pending');
            authTwoFactorUtil.verifyCode.mockReturnValue(58123456);
        });

        it('verifies the trimmed code against the decrypted pending secret and resets the attempt', async () => {
            await expect(
                service.verifySetupCode(
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
            expect(
                userTwoFactorRepository.incrementAttempt
            ).not.toHaveBeenCalled();
        });

        it('marks the TOTP step used before resetting the counter', async () => {
            await service.verifySetupCode(
                baseUser,
                'encrypted-pending',
                '654321'
            );

            expect(userTwoFactorRepository.markTotpUsed).toHaveBeenCalledWith(
                'user-quartz',
                58123456
            );
            expect(userTwoFactorRepository.markTotpUsed).toHaveBeenCalledBefore(
                userTwoFactorRepository.resetTwoFactorAttempt
            );
        });

        it('throws AuthTwoFactorInvalidException when the step was already used', async () => {
            userTwoFactorRepository.markTotpUsed.mockResolvedValue(false);

            await expect(
                service.verifySetupCode(baseUser, 'encrypted-pending', '654321')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorInvalidException without a reset when the code does not match', async () => {
            authTwoFactorUtil.verifyCode.mockReturnValue(null);

            await expect(
                service.verifySetupCode(baseUser, 'encrypted-pending', '654321')
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
                service.verifySetupCode(baseUser, 'encrypted-pending', '654321')
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

            await expect(service.setup(baseUser)).resolves.toEqual({
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

    describe('saveSetup', () => {
        it('stores the encrypted pending secret', async () => {
            await service.saveSetup('user-quartz', 'encrypted-secret');

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

            await service.saveSetupConsumingBackupCode(
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
                service.saveSetupConsumingBackupCode(
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

            await service.saveSetupConsumingBackupCode(
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

            expect(service.getPendingSecret(user)).toBe('pending-secret');
        });

        it('throws AuthTwoFactorAlreadyEnabledException when already enabled with no pending secret', () => {
            expect(() => service.getPendingSecret(baseUser)).toThrow(
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

            expect(() => service.getPendingSecret(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                    messagePath: 'auth.error.twoFactorSetupRequired',
                })
            );
        });

        it('throws AuthTwoFactorSetupRequiredException when the user has no two-factor row', () => {
            expect(() =>
                service.getPendingSecret({ ...baseUser, twoFactor: null })
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
            userTwoFactorRepository.enableTwoFactor.mockResolvedValue(true);

            await expect(
                service.enableTwoFactor('user-quartz', 'pending-secret')
            ).resolves.toEqual(['CODE1']);
            expect(
                userTwoFactorRepository.enableTwoFactor
            ).toHaveBeenCalledWith('user-quartz', 'pending-secret', ['hash1']);
        });

        it('throws AuthTwoFactorSetupRequiredException when the guarded write misses', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.enableTwoFactor.mockResolvedValue(false);

            await expect(
                service.enableTwoFactor('user-quartz', 'pending-secret')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSetupRequired
                    ],
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('throws AuthTwoFactorSetupRequiredException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.enableTwoFactor('user-quartz', 'pending-secret')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSetupRequired
                    ],
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException raised while enabling', async () => {
            const failure = new UserEmailNotVerifiedException();
            authTwoFactorUtil.generateBackupCodes.mockImplementation(() => {
                throw failure;
            });

            await expect(
                service.enableTwoFactor('user-quartz', 'pending-secret')
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error raised while enabling', async () => {
            const error = new Error('boom');
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.enableTwoFactor.mockRejectedValue(error);
            databaseUtil.toException.mockReturnValue(null);

            const call = service.enableTwoFactor('user-quartz', 'pending');

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
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockResolvedValue(
                true
            );

            await expect(
                service.regenerateTwoFactorBackupCodes('user-quartz')
            ).resolves.toEqual(['CODE1', 'CODE2']);
            expect(
                userTwoFactorRepository.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith('user-quartz', ['hash1', 'hash2']);
        });

        it('throws AuthTwoFactorNotEnabledException when the guarded write misses', async () => {
            authTwoFactorUtil.generateBackupCodes.mockReturnValue({
                codes: ['CODE1'],
                hashes: ['hash1'],
            });
            userTwoFactorRepository.regenerateTwoFactorBackupCodes.mockResolvedValue(
                false
            );

            await expect(
                service.regenerateTwoFactorBackupCodes('user-quartz')
            ).rejects.toMatchObject({
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
            const failure = new UserEmailNotVerifiedException();
            authTwoFactorUtil.generateBackupCodes.mockImplementation(() => {
                throw failure;
            });

            await expect(
                service.regenerateTwoFactorBackupCodes('user-quartz')
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
                service.regenerateTwoFactorBackupCodes('user-quartz')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('assertEnabled', () => {
        it('passes when two-factor is enabled', () => {
            expect(() => service.assertEnabled(baseUser)).not.toThrow();
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => service.assertEnabled(user)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                    messagePath: 'auth.error.twoFactorNotEnabled',
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                service.assertEnabled({ ...baseUser, twoFactor: null })
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
                service.getBackupCodeForSetup(
                    { ...baseUser, twoFactor: null },
                    'backup-code'
                )
            ).toBeNull();
        });

        it('returns the backup code when two-factor is enabled', () => {
            expect(service.getBackupCodeForSetup(baseUser, 'backup-code')).toBe(
                'backup-code'
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when two-factor is enabled and no backup code is given', () => {
            expect(() => service.getBackupCodeForSetup(baseUser, null)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                    messagePath: 'auth.error.twoFactorBackupCodeRequired',
                })
            );
        });

        it('throws AuthTwoFactorBackupCodeRequiredException when the backup code is blank', () => {
            expect(() => service.getBackupCodeForSetup(baseUser, '')).toThrow(
                expect.objectContaining({
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                })
            );
        });
    });

    describe('disableInTx', () => {
        it('disables two-factor on the given transaction', async () => {
            userTwoFactorRepository.disableTwoFactorInTx.mockResolvedValue(
                true
            );

            await service.disableInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.disableTwoFactorInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });

        it('throws AuthTwoFactorNotEnabledException when the guarded write misses', async () => {
            userTwoFactorRepository.disableTwoFactorInTx.mockResolvedValue(
                false
            );

            await expect(
                service.disableInTx(tx, 'user-quartz')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });
    });

    describe('removeInTx', () => {
        it('deletes the two-factor row of the user on the given transaction', async () => {
            await service.removeInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.deleteByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('resetByAdminInTx', () => {
        it('resets two-factor on the given transaction', async () => {
            await service.resetByAdminInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorByAdminInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('resetAttemptInTx', () => {
        it('resets the counter through the repository on the given transaction', async () => {
            await service.resetAttemptInTx(tx, 'user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('recordVerificationInTx', () => {
        it('records the verified check on the given transaction', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await expect(
                service.recordVerificationInTx(tx, baseUser, verifiedResult)
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
                service.recordVerificationInTx(tx, baseUser, verifiedResult)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.verifyTwoFactorInTx.mockResolvedValue(true);

            await service.recordVerificationInTx(
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
                service.recordVerification(baseUser, verifiedResult)
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
                service.recordVerification(baseUser, verifiedResult)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
            });
        });

        it('falls back to an empty backup-code list when the user carries no two-factor row', async () => {
            userTwoFactorRepository.verifyTwoFactor.mockResolvedValue(true);

            await service.recordVerification(
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
                service.createDisabledInTx(tx, 'user-quartz', 'admin-quartz')
            ).resolves.toBe(disabled);
            expect(
                userTwoFactorRepository.createDisabledInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', 'admin-quartz');
        });
    });

    describe('getEnabledTwoFactor', () => {
        it('returns the two-factor row when two-factor is enabled', () => {
            expect(service['getEnabledTwoFactor'](baseUser)).toBe(
                baseTwoFactor
            );
        });

        it('throws AuthTwoFactorNotEnabledException when two-factor is not enabled', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...baseTwoFactor, enabled: false },
            };

            expect(() => service['getEnabledTwoFactor'](user)).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });

        it('throws AuthTwoFactorNotEnabledException when the user has no two-factor row', () => {
            expect(() =>
                service['getEnabledTwoFactor']({ ...baseUser, twoFactor: null })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                })
            );
        });
    });
});
