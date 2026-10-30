import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
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
import { AppBaseException } from '@app/exceptions/app.base.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';

describe('UserTwoFactorDomain', () => {
    const userTwoFactorRepository: MockProxy<UserTwoFactorRepository> =
        mock<UserTwoFactorRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();

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

    const verifiedResult: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserTwoFactorDomain,
                {
                    provide: UserTwoFactorRepository,
                    useValue: userTwoFactorRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: AuthTwoFactorUtil, useValue: authTwoFactorUtil },
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

    describe('incrementAttempt', () => {
        it('returns the attempt count the repository stored', async () => {
            userTwoFactorRepository.incrementAttempt.mockResolvedValue(3);

            await expect(domain.incrementAttempt('user-quartz')).resolves.toBe(
                3
            );
            expect(
                userTwoFactorRepository.incrementAttempt
            ).toHaveBeenCalledWith('user-quartz');
        });
    });

    describe('resetAttempt', () => {
        it('resets the attempt counter', async () => {
            await domain.resetAttempt('user-quartz');

            expect(
                userTwoFactorRepository.resetTwoFactorAttempt
            ).toHaveBeenCalledWith('user-quartz');
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

            await expect(call).rejects.toBeInstanceOf(AppBaseException);
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
});
