import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    IAuthPassword,
    IAuthPasswordOptions,
} from '@modules/auth/interfaces/auth.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { PasswordHistory, User } from '@generated/prisma-client/client';

/** Hashes passwords and evaluates password dates. See docs/authentication.md. */
@Injectable()
export class AuthPasswordUtil {
    private readonly passwordExpiredInMs: number;
    private readonly passwordExpiredTemporaryInMs: number;
    private readonly passwordSaltLength: number;
    private readonly passwordPeriodInDays: number;
    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.passwordExpiredInMs = this.configService.get<number>(
            'auth.password.expiredInMs'
        )!;
        this.passwordExpiredTemporaryInMs = this.configService.get<number>(
            'auth.password.expiredTemporaryInMs'
        )!;
        this.passwordSaltLength = this.configService.get<number>(
            'auth.password.saltLength'
        )!;
        this.passwordPeriodInDays = this.configService.get<number>(
            'auth.password.periodInDays'
        )!;
        this.passwordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
    }

    validatePassword(passwordString: string, passwordHash: string): boolean {
        return this.helperHashService.bcryptCompare(
            passwordString,
            passwordHash
        );
    }

    /** True when the user exceeded the max password attempts; always false if attempt tracking is off. */
    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt
            ? (user.passwordAttempt ?? 0) >= this.passwordMaxAttempt
            : false;
    }

    /** Builds the bcrypt hash plus expiry and period dates; temporary uses a shorter expiry. */
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword {
        const today = this.helperDateService.create();
        const salt: string = this.helperHashService.bcryptGenerateSalt(
            this.passwordSaltLength
        );
        const passwordExpiredDuration = this.helperDateService.createDuration({
            milliseconds: options?.temporary
                ? this.passwordExpiredTemporaryInMs
                : this.passwordExpiredInMs,
        });
        const passwordExpired: Date = this.helperDateService.forward(
            today,
            passwordExpiredDuration
        );
        const passwordHash = this.helperHashService.bcryptHash(password, salt);
        const passwordPeriodDuration = this.helperDateService.createDuration({
            days: this.passwordPeriodInDays,
        });
        const passwordPeriodExpired: Date = this.helperDateService.forward(
            today,
            passwordPeriodDuration
        );

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            passwordPeriodExpired,
        };
    }

    createPasswordRandom(): string {
        return this.helperStringService.random(10);
    }

    /** True when the expiry date has passed; false when no expiry is set. */
    checkPasswordExpired(passwordExpired?: Date | null): boolean {
        if (!passwordExpired) {
            return false;
        }

        const today: Date = this.helperDateService.create();
        return today > passwordExpired;
    }

    /** Returns the matching history record if the password was used before, blocking recent reuse. */
    checkPasswordPeriod(
        histories: PasswordHistory[],
        password: string
    ): PasswordHistory | null {
        for (const history of histories) {
            const isPasswordMatch = this.helperHashService.bcryptCompare(
                password,
                history.password
            );
            if (isPasswordMatch) {
                return history;
            }
        }

        return null;
    }

    getPasswordPeriodInDays(): number {
        return this.passwordPeriodInDays;
    }
}
