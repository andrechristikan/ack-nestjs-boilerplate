import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import type {
    IAccountCredentialAttempt,
    IAccountPasswordChangeResult,
    IAccountPasswordUpdateByAdminResult,
} from '@modules/account/interfaces/account.interface';
import type {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordMustNewException } from '@modules/user/exceptions/user.password-must-new.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserForgotPassword,
} from '@modules/user/interfaces/user.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountPasswordDomain {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async assertNotInHistory(
        passwordHistories: PasswordHistory[],
        newPassword: string
    ): Promise<void> {
        const passwordCheck = await this.authPasswordUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            const passwordPeriodInDays =
                this.authPasswordUtil.getPasswordPeriodInDays();

            throw new UserPasswordMustNewException(passwordPeriodInDays);
        }
    }

    /** Counts one credential attempt; when the attempt budget is spent, locks the account and answers the revoked sessions to purge. */
    async registerCredentialAttempt(
        email: string
    ): Promise<IAccountCredentialAttempt> {
        const attempt =
            await this.userAuthDomain.incrementCredentialAttempt(email);
        if (attempt.isAttemptCounted) {
            return { attempt, revoked: null };
        }

        const revoked = await this.reachMaxAttempt(attempt.user.id);

        return { attempt, revoked };
    }

    /** Deactivates the user that spent its password attempts and revokes its sessions and devices. */
    async reachMaxAttempt(userId: string): Promise<ISessionRef[]> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const isDeactivated =
                    await this.userDomain.deactivateForMaxPasswordAttemptInTx(
                        tx,
                        userId
                    );
                if (!isDeactivated) {
                    throw new UserPasswordAttemptMaxException();
                }

                const sessions =
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        userId,
                        now
                    );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );

                return sessions;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserPasswordAttemptMaxException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Refuses a new password that repeats one inside the history period. */
    async assertNew(userId: string, newPassword: string): Promise<void> {
        const passwordHistories =
            await this.passwordHistoryDomain.getActiveByUser(userId);

        await this.assertNotInHistory(passwordHistories, newPassword);
    }

    /** Checks the old password and the history period of an account that has a password. */
    async verifyChange(
        user: IUser,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        if (user.password === null) {
            return;
        }

        // Sequential by design: gate before the work it guards
        await this.userPasswordDomain.verifyOldPassword(
            user.id,
            user.password,
            oldPassword
        );
        const [, passwordHistories] = await Promise.all([
            this.userPasswordDomain.resetPasswordAttempt(user.id),
            this.passwordHistoryDomain.getActiveByUser(user.id),
        ]);

        await this.assertNotInHistory(passwordHistories, newPassword);
    }

    async updateByAdmin(
        userId: string,
        password: IAuthPassword,
        updatedBy: string
    ): Promise<IAccountPasswordUpdateByAdminResult> {
        try {
            return await this.databaseService.withTransaction(async tx => {
                const user = await this.userDomain.updatePasswordInTx(
                    tx,
                    userId,
                    password,
                    updatedBy
                );
                const passwordHistory =
                    await this.passwordHistoryDomain.createInTx(
                        tx,
                        userId,
                        password.passwordHash,
                        EnumPasswordHistoryType.admin,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        updatedBy
                    );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    updatedBy,
                    password.passwordCreated
                );

                return {
                    user,
                    passwordHistoryId: passwordHistory.id,
                    revoked,
                };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async change(
        user: IUser,
        password: IAuthPassword,
        twoFactorVerified: IAuthTwoFactorVerifyResult | null
    ): Promise<IAccountPasswordChangeResult> {
        try {
            return await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    user.id,
                    password,
                    user.id
                );
                const passwordHistory =
                    await this.passwordHistoryDomain.createInTx(
                        tx,
                        user.id,
                        password.passwordHash,
                        EnumPasswordHistoryType.profile,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        user.id
                    );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    password.passwordCreated
                );
                if (twoFactorVerified) {
                    await this.userTwoFactorDomain.recordVerificationInTx(
                        tx,
                        user,
                        twoFactorVerified
                    );
                }

                return { passwordHistoryId: passwordHistory.id, revoked };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async reset(
        reset: IUserForgotPassword,
        password: IAuthPassword,
        twoFactorVerified: IAuthTwoFactorVerifyResult | null
    ): Promise<ISessionRef[]> {
        try {
            return await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    reset.userId,
                    password,
                    reset.userId
                );
                await this.passwordHistoryDomain.createInTx(
                    tx,
                    reset.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.forgot,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    reset.userId
                );
                await this.userPasswordDomain.markResetUsedInTx(
                    tx,
                    reset.id,
                    password.passwordCreated
                );
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    reset.userId,
                    reset.userId,
                    password.passwordCreated
                );
                if (twoFactorVerified) {
                    await this.userTwoFactorDomain.recordVerificationInTx(
                        tx,
                        reset.user,
                        twoFactorVerified
                    );
                }

                return revoked;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserTokenInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}
