import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { PasswordHistory, User } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserForgotPassword,
} from '@modules/user/interfaces/user.interface';

describe('AccountPasswordDomain', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let domain: AccountPasswordDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const revoked: ISessionRef[] = [{ id: 'session-one' }];
    const userRow = { id: 'user-hollow', updatedAt: now } as User;
    const history: PasswordHistory = {
        id: 'history-created',
        userId: 'user-hollow',
        password: 'hashed',
        type: EnumPasswordHistoryType.profile,
        expiredAt: new Date('2026-04-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
    };
    const user = {
        id: 'user-hollow',
        email: 'hollow@example.com',
        status: EnumUserStatus.active,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        password: 'hashed-password',
        role: { type: EnumRoleType.user },
        twoFactor: null,
    } as IUser;
    const twoFactorVerified: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };
    const resetRow = {
        id: 'forgot-one',
        userId: 'user-hollow',
        user,
    } as IUserForgotPassword;

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revoked);
        passwordHistoryDomain.createInTx.mockResolvedValue(history);
        userDomain.updatePasswordInTx.mockResolvedValue(userRow);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountPasswordDomain,
                { provide: UserDomain, useValue: userDomain },
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserPasswordDomain, useValue: userPasswordDomain },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(AccountPasswordDomain);
    });

    describe('registerCredentialAttempt', () => {
        const counted: IUserCredentialAttempt = {
            user,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        it('answers the counted attempt with no revoked sessions while the budget holds', async () => {
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(
                counted
            );

            await expect(
                domain.registerCredentialAttempt('hollow@example.com')
            ).resolves.toEqual({ attempt: counted, revoked: null });

            expect(
                userAuthDomain.incrementCredentialAttempt
            ).toHaveBeenCalledWith('hollow@example.com');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('locks the account and answers the revoked sessions when the budget is spent', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(spent);
            userDomain.deactivateForMaxPasswordAttemptInTx.mockResolvedValue(
                true
            );

            await expect(
                domain.registerCredentialAttempt('hollow@example.com')
            ).resolves.toEqual({ attempt: spent, revoked });

            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow');
        });

        it('throws UserPasswordAttemptMaxException when the lockout finds the account already deactivated', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(spent);
            userDomain.deactivateForMaxPasswordAttemptInTx.mockResolvedValue(
                false
            );

            await expect(
                domain.registerCredentialAttempt('hollow@example.com')
            ).rejects.toMatchObject({
                constructor: UserPasswordAttemptMaxException,
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
            });
        });
    });

    describe('reachMaxAttempt', () => {
        it('deactivates the user and revokes its sessions and devices on one transaction', async () => {
            userDomain.deactivateForMaxPasswordAttemptInTx.mockResolvedValue(
                true
            );

            await expect(domain.reachMaxAttempt('user-hollow')).resolves.toBe(
                revoked
            );

            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-hollow');
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'user-hollow',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'user-hollow',
                now
            );
        });

        it('throws the attempt-max exception without revoking when the user was already deactivated', async () => {
            userDomain.deactivateForMaxPasswordAttemptInTx.mockResolvedValue(
                false
            );

            await expect(
                domain.reachMaxAttempt('user-hollow')
            ).rejects.toMatchObject({
                constructor: UserPasswordAttemptMaxException,
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
            });
            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
            expect(deviceDomain.revokeAllByUserInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to the attempt-max exception', async () => {
            const conflict = new Error('conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.reachMaxAttempt('user-hollow')
            ).rejects.toMatchObject({
                constructor: UserPasswordAttemptMaxException,
            });
        });

        it('wraps any other failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                domain.reachMaxAttempt('user-hollow')
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });

    describe('assertNew', () => {
        it('passes when the new password is outside the period of the history', async () => {
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockResolvedValue(null);

            await expect(
                domain.assertNew('user-hollow', 'new-password')
            ).resolves.toBeUndefined();

            expect(authPasswordUtil.checkPasswordPeriod).toHaveBeenCalledWith(
                [],
                'new-password'
            );
        });

        it('throws the must-new exception with the period in days when the password repeats', async () => {
            passwordHistoryDomain.getActiveByUser.mockResolvedValue([]);
            authPasswordUtil.checkPasswordPeriod.mockResolvedValue(history);
            authPasswordUtil.getPasswordPeriodInDays.mockReturnValue(90);

            await expect(
                domain.assertNew('user-hollow', 'new-password')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordMustNew,
            });
        });
    });

    describe('verifyChange', () => {
        it('verifies the old password, then resets the attempt counter and reads the history together', async () => {
            const calls: string[] = [];
            const deferredHistory = Promise.withResolvers<PasswordHistory[]>();
            userPasswordDomain.verifyOldPassword.mockImplementation(
                async () => {
                    calls.push('verifyOld');
                }
            );
            userPasswordDomain.resetPasswordAttempt.mockImplementation(
                async () => {
                    calls.push('reset');
                    deferredHistory.resolve([]);

                    return userRow;
                }
            );
            passwordHistoryDomain.getActiveByUser.mockImplementation(() => {
                calls.push('history');

                return deferredHistory.promise;
            });
            authPasswordUtil.checkPasswordPeriod.mockResolvedValue(null);

            await domain.verifyChange(user, 'old-password', 'new-password');

            expect(userPasswordDomain.verifyOldPassword).toHaveBeenCalledWith(
                'user-hollow',
                'hashed-password',
                'old-password'
            );
            expect(
                userPasswordDomain.resetPasswordAttempt
            ).toHaveBeenCalledWith('user-hollow');
            expect(calls).toEqual(['verifyOld', 'reset', 'history']);
        });

        it('skips both checks for an account without a password', async () => {
            await domain.verifyChange(
                { ...user, password: null },
                'old-password',
                'new-password'
            );

            expect(userPasswordDomain.verifyOldPassword).not.toHaveBeenCalled();
            expect(
                passwordHistoryDomain.getActiveByUser
            ).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdmin', () => {
        it('writes the password, the admin history row, and the revoke on one transaction', async () => {
            const calls: string[] = [];
            userDomain.updatePasswordInTx.mockImplementation(async () => {
                calls.push('password');

                return userRow;
            });
            passwordHistoryDomain.createInTx.mockImplementation(async () => {
                calls.push('history');

                return history;
            });
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return revoked;
                }
            );

            const result = await domain.updateByAdmin(
                'user-hollow',
                password,
                'admin-one'
            );

            expect(result).toEqual({
                user: userRow,
                passwordHistoryId: 'history-created',
                revoked,
            });
            expect(calls).toEqual(['password', 'history', 'revoke']);
            expect(userDomain.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                password,
                'admin-one'
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'hashed',
                EnumPasswordHistoryType.admin,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'admin-one'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'admin-one',
                password.passwordCreated
            );
        });

        it('wraps a failure in the unknown exception', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('down')
            );

            await expect(
                domain.updateByAdmin('user-hollow', password, 'admin-one')
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });

    describe('change', () => {
        it('writes the password, the profile history row, and the revoke without a verified two-factor', async () => {
            const result = await domain.change(user, password, null);

            expect(result).toEqual({
                passwordHistoryId: 'history-created',
                revoked,
            });
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'hashed',
                EnumPasswordHistoryType.profile,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-hollow'
            );
            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).not.toHaveBeenCalled();
        });

        it('records the verified two-factor on the same transaction', async () => {
            await domain.change(user, password, twoFactorVerified);

            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, user, twoFactorVerified);
        });
    });

    describe('reset', () => {
        beforeEach(() => {
            userPasswordDomain.markResetUsedInTx.mockResolvedValue(undefined);
        });

        it('writes the password, the forgot history row, the used mark, and the revoke', async () => {
            const calls: string[] = [];
            passwordHistoryDomain.createInTx.mockImplementation(async () => {
                calls.push('history');

                return history;
            });
            userPasswordDomain.markResetUsedInTx.mockImplementation(
                async () => {
                    calls.push('markUsed');
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revoke');

                    return revoked;
                }
            );

            await expect(domain.reset(resetRow, password, null)).resolves.toBe(
                revoked
            );

            expect(calls).toEqual(['history', 'markUsed', 'revoke']);
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-hollow',
                'hashed',
                EnumPasswordHistoryType.forgot,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-hollow'
            );
            expect(userPasswordDomain.markResetUsedInTx).toHaveBeenCalledWith(
                tx,
                'forgot-one',
                password.passwordCreated
            );
        });

        it('records the verified two-factor of the reset account', async () => {
            await domain.reset(resetRow, password, twoFactorVerified);

            expect(
                userTwoFactorDomain.recordVerificationInTx
            ).toHaveBeenCalledWith(tx, user, twoFactorVerified);
        });

        it('maps a write conflict to the token-invalid exception', async () => {
            const conflict = new Error('conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                domain.reset(resetRow, password, null)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });
    });
});
