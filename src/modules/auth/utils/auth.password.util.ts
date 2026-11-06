import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    IAuthPassword,
    IAuthPasswordOptions,
} from '@modules/auth/interfaces/auth.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { PasswordHistory } from '@generated/prisma-client/client';

@Injectable()
export class AuthPasswordUtil {
    private readonly passwordExpiredInMs: number;
    private readonly passwordExpiredTemporaryInMs: number;
    private readonly passwordSaltLength: number;
    private readonly passwordPeriodInDays: number;
    private readonly passwordTemporaryLength: number;

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
        this.passwordTemporaryLength = this.configService.get<number>(
            'auth.password.temporaryLength'
        )!;
    }

    async validatePassword(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean> {
        return this.helperHashService.bcryptCompare(
            passwordString,
            passwordHash
        );
    }

    async createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): Promise<IAuthPassword> {
        const today = this.helperDateService.create();
        const salt: string = await this.helperHashService.bcryptGenerateSalt(
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
        const passwordHash = await this.helperHashService.bcryptHash(
            password,
            salt
        );
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
    checkPasswordExpired(passwordExpired: Date | null): boolean {
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
        const matches = await Promise.all(
            histories.map(history =>
                this.helperHashService.bcryptCompare(password, history.password)
            )
        );
        const matchIndex = matches.indexOf(true);

        return matchIndex === -1 ? null : histories[matchIndex]!;
    }

    getPasswordPeriodInDays(): number {
        return this.passwordPeriodInDays;
    }
}
