import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import type { IAccountTwoFactorLogin } from '@modules/account/interfaces/account.interface';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import type {
    IAuthToken,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type {
    IUser,
    IUserTwoFactorLoginSetup,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountTwoFactorDomain {
    constructor(
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly accountLoginDomain: AccountLoginDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    /** Turns two-factor off for the owner and revokes its sessions. */
    async disable(userId: string): Promise<ISessionRef[]> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                await this.userTwoFactorDomain.disableInTx(tx, userId);

                return this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Resets two-factor for a user on behalf of an admin and revokes its sessions. */
    async resetByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<ISessionRef[]> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                await this.userTwoFactorDomain.resetByAdminInTx(tx, userId);

                return this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    updatedBy,
                    now
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Counts one verification attempt, checks the code or backup code, and resets the counter on a match; a count on a multiple of the max locks two-factor. */
    async verify(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        // Sequential by design: gate before the work it guards
        await this.authTwoFactorDomain.assertUnlocked(user);
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        // Sequential by design: gate before the work it guards
        const attempt = await this.userTwoFactorDomain.incrementAttempt(
            user.id
        );
        await this.authTwoFactorDomain.assertAttemptAllowed(user, attempt);

        const verified = await this.authTwoFactorDomain.verifyTwoFactor(
            user.twoFactor!,
            { method, code, backupCode }
        );
        if (!verified.isValid) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorDomain.resetAttempt(user.id);

        return verified;
    }

    async verifyIfEnabled(
        user: IUser,
        verify: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult | null> {
        if (!user.twoFactor?.enabled) {
            return null;
        }

        return this.verify(user, verify);
    }

    /** Checks a code from a newly set-up authenticator against the pending secret, under the same attempt policy as every other check. */
    async verifySetupCode(
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        await this.authTwoFactorDomain.assertUnlocked(user);
        // Sequential by design: gate before the work it guards
        const attempt = await this.userTwoFactorDomain.incrementAttempt(
            user.id
        );
        await this.authTwoFactorDomain.assertAttemptAllowed(user, attempt);

        const isValid = this.authTwoFactorDomain.verifySetupCode(
            pendingSecret,
            user.id,
            code
        );
        if (!isValid) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorDomain.resetAttempt(user.id);
    }

    /** Starts an authenticator setup; while two-factor is enabled a valid unused backup code is required and consumed, and the account keeps its current state until the new authenticator is confirmed. */
    async setup(
        user: IUser,
        backupCode: string | null
    ): Promise<IUserTwoFactorSetup> {
        let backupCodeVerified: IAuthTwoFactorVerifyResult | null = null;
        if (user.twoFactor?.enabled) {
            if (!backupCode) {
                throw new AuthTwoFactorBackupCodeRequiredException();
            }

            // Sequential by design: gate before the work it guards
            backupCodeVerified = await this.verify(user, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: null,
                backupCode,
            });
        }

        try {
            const { encryptedSecret, otpauthUrl, secret } =
                await this.authTwoFactorDomain.setupTwoFactor(
                    user.id,
                    user.email
                );
            if (backupCodeVerified) {
                await this.userTwoFactorDomain.saveSetupConsumingBackupCode(
                    user,
                    encryptedSecret,
                    backupCodeVerified
                );
            } else {
                await this.userTwoFactorDomain.saveSetup(
                    user.id,
                    encryptedSecret
                );
            }

            return { secret, otpauthUrl };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Resolves the login challenge and its user, then verifies the code or backup code against the user. */
    async verifyLogin(
        challengeToken: string,
        verify: IAuthTwoFactorVerify
    ): Promise<IAccountTwoFactorLogin> {
        const challenge =
            await this.authTwoFactorDomain.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const user = await this.userTwoFactorDomain.getOneForLoginVerify(
            challenge.userId
        );
        // Sequential by design: gate before the work it guards
        const verified = await this.verify(user, verify);

        return { user, challenge, verified };
    }

    /** Resolves the login challenge and its user, then verifies the code of the pending authenticator. */
    async verifyLoginSetup(
        challengeToken: string,
        code: string
    ): Promise<IUserTwoFactorLoginSetup> {
        const challenge =
            await this.authTwoFactorDomain.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const { user, pendingSecret } =
            await this.userTwoFactorDomain.getOneForLoginSetup(
                challenge.userId
            );
        // Sequential by design: gate before the work it guards
        await this.verifySetupCode(user, pendingSecret, code);

        return { user, pendingSecret };
    }

    async recordLoginVerification({
        user,
        verified,
    }: IAccountTwoFactorLogin): Promise<void> {
        try {
            await this.userTwoFactorDomain.recordVerification(user, verified);
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Issues the session of a verified login challenge and drops the challenge. */
    async issueLoginTokens(
        { user, challenge }: IAccountTwoFactorLogin,
        challengeToken: string
    ): Promise<IAuthToken> {
        try {
            const loginAt = this.helperDateService.create();
            const [tokens] = await Promise.all([
                this.accountLoginDomain.createTokenAndSession(
                    user,
                    challenge.device,
                    challenge.loginFrom,
                    challenge.loginWith,
                    loginAt
                ),
                this.authTwoFactorDomain.deleteChallenge(challengeToken),
            ]);

            return tokens;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
