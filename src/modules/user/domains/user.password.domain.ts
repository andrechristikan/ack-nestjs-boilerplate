import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { User } from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserForgotPasswordRequestLimitExceededException } from '@modules/user/exceptions/user.forgot-password-request-limit-exceeded.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUserForgotPassword,
    IUserForgotPasswordCreate,
    IUserForgotPasswordPrepared,
    IUserPasswordSet,
    IUserPasswordTemporary,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';

@Injectable()
export class UserPasswordDomain {
    private readonly forgotResendInMinutes: number;
    private readonly passwordAttemptEnabled: boolean;
    private readonly passwordMaxAttempt: number;

    constructor(
        private readonly userPasswordRepository: UserPasswordRepository,
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly userPasswordUtil: UserPasswordUtil,
        private readonly helperHashService: HelperHashService,
        private readonly userDomain: UserDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly configService: ConfigService
    ) {
        const forgotResendInMs = this.configService.get<number>(
            'forgotPassword.resendInMs'
        )!;
        this.forgotResendInMinutes = forgotResendInMs / ms('1m');
        this.passwordAttemptEnabled = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.resetPasswordAttempt(userId);
    }

    async createTemporaryPassword(): Promise<IUserPasswordTemporary> {
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password = await this.authPasswordUtil.createPassword(
            passwordString,
            { temporary: true }
        );

        return { password, passwordString };
    }

    /** Counts one password attempt before the password is compared; false when the attempt budget is spent. */
    async incrementPasswordAttempt(userId: string): Promise<boolean> {
        if (!this.passwordAttemptEnabled) {
            return true;
        }

        const attempt = await this.userRepository.incrementPasswordAttempt(
            userId,
            this.passwordMaxAttempt
        );

        return attempt !== null;
    }

    assertAttemptCounted(isAttemptCounted: boolean): void {
        if (!isAttemptCounted) {
            throw new UserPasswordAttemptMaxException();
        }
    }

    /** Checks the old password against the stored hash; the caller counts the attempt and resets the counter. */
    async assertOldPasswordMatch(
        user: IUserPasswordSet,
        password: string
    ): Promise<void> {
        const isPasswordValid = await this.authPasswordUtil.validatePassword(
            password,
            user.password
        );
        if (!isPasswordValid) {
            throw new UserPasswordNotMatchException();
        }
    }

    /** Resolves the active user of an email whose last request is out of its resend window, with a fresh reset payload. */
    async prepareForgotPassword(
        email: string
    ): Promise<IUserForgotPasswordPrepared> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        }

        // Sequential by design: gate before the work it guards
        const lastForgotPassword =
            await this.userPasswordRepository.findOneLatestByForgotPassword(
                user.id
            );
        if (lastForgotPassword) {
            const waitInMinutes = this.userUtil.getResendWaitInMinutes(
                lastForgotPassword.createdAt,
                this.forgotResendInMinutes
            );
            if (waitInMinutes !== null) {
                throw new UserForgotPasswordRequestLimitExceededException(
                    waitInMinutes
                );
            }
        }

        const forgot = this.userPasswordUtil.createForgot();

        return { user, forgot };
    }

    async createForgotPassword(
        userId: string,
        email: string,
        forgot: IUserForgotPasswordCreate
    ): Promise<void> {
        await this.userPasswordRepository.createReplacingUnused(
            userId,
            email,
            forgot
        );
    }

    async getOneActiveReset(token: string): Promise<IUserForgotPassword> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const reset =
            await this.userPasswordRepository.findOneActiveByForgotPasswordToken(
                hashedToken
            );
        if (!reset) {
            throw new UserNotFoundException();
        }

        return reset;
    }

    async markResetUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        usedAt: Date
    ): Promise<void> {
        const isMarkedUsed = await this.userPasswordRepository.markUsedInTx(
            tx,
            forgotPasswordId,
            usedAt
        );
        if (!isMarkedUsed) {
            throw new UserTokenInvalidException();
        }
    }
}
