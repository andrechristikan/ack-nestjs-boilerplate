import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthPasswordTemporary,
} from '@modules/auth/interfaces/auth.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { PasswordHistory } from '@generated/prisma-client/client';

@Injectable()
export class AuthPasswordUtil {
    private readonly passwordExpiredTemporaryInMs: number;
    private readonly passwordPeriodInDays: number;
    private readonly passwordTemporaryLength: number;

    constructor(
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.passwordExpiredTemporaryInMs = this.configService.get<number>(
            'auth.password.expiredTemporaryInMs'
        )!;
        this.passwordPeriodInDays = this.configService.get<number>(
            'auth.password.periodInDays'
        )!;
        this.passwordTemporaryLength = this.configService.get<number>(
            'auth.password.temporaryLength'
        )!;
    }

    async isPasswordMatched(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean> {
        return this.helperHashService.argon2Compare(
            passwordString,
            passwordHash
        );
    }

    async createPassword(
        password: string,
        options: IAuthPasswordOptions
    ): Promise<IAuthPasswordTemporary>;
    async createPassword(password: string): Promise<IAuthPassword>;
    async createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): Promise<IAuthPassword> {
        const today = this.helperDateService.create();
        let passwordExpired: Date | null = null;
        if (options?.temporary) {
            const passwordExpiredDuration =
                this.helperDateService.createDuration({
                    milliseconds: this.passwordExpiredTemporaryInMs,
                });
            passwordExpired = this.helperDateService.forward(
                today,
                passwordExpiredDuration
            );
        }
        const passwordHash = await this.helperHashService.argon2Hash(password);
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
        return this.helperStringService.random(this.passwordTemporaryLength);
    }

    /** True when the expiry date has passed; false when no expiry is set. */
    isPasswordExpired(passwordExpired: Date | null): boolean {
        if (!passwordExpired) {
            return false;
        }

        const today: Date = this.helperDateService.create();
        return today > passwordExpired;
    }

    /** Returns the first of the given histories the password matches, null when it matches none. */
    async checkPasswordPeriod(
        histories: PasswordHistory[],
        password: string
    ): Promise<PasswordHistory | null> {
        // Sequential by design: an argon2id compare over several hashes, stopping at the first match.
        for (const history of histories) {
            const matched = await this.helperHashService.argon2Compare(
                password,
                history.password
            );
            if (matched) {
                return history;
            }
        }

        return null;
    }

    createContextWords(
        appName: string,
        email: string,
        username: string | null,
        name: string | null
    ): string[] {
        const localPart = email.slice(0, email.indexOf('@'));
        const words = [appName, localPart];
        if (username !== null) {
            words.push(username);
        }
        if (name !== null) {
            words.push(name);
        }

        return words;
    }

    getPasswordPeriodInDays(): number {
        return this.passwordPeriodInDays;
    }
}
