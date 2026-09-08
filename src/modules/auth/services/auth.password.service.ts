import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IAuthPassword,
    IAuthPasswordOptions,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthPasswordService } from '@modules/auth/interfaces/auth.password.service.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { PasswordHistory, User } from '@generated/prisma-client';

/** Hashes, encrypts and evaluates the password lifecycle. See docs/authentication.md. */
@Injectable()
export class AuthPasswordService implements IAuthPasswordService {
    private readonly passwordExpiredInMs: number;
    private readonly passwordExpiredTemporaryInMs: number;
    private readonly passwordSaltLength: number;
    private readonly passwordPeriodInDays: number;
    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;

    constructor(
        private readonly helperEncryptionService: HelperEncryptionService,
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

    /** Builds the bcrypt hash plus expiry, period, and reversibly encrypted copy; temporary uses a shorter expiry. */
    createPassword(
        userId: string,
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword {
        const today = this.helperDateService.create();
        const salt: string = this.helperHashService.bcryptGenerateSalt(
            this.passwordSaltLength
        );
        const passwordExpired: Date = this.helperDateService.forward(
            today,
            this.helperDateService.createDuration({
                milliseconds: options?.temporary
                    ? this.passwordExpiredTemporaryInMs
                    : this.passwordExpiredInMs,
            })
        );
        const passwordHash = this.helperHashService.bcryptHash(password, salt);
        const passwordPeriodExpired: Date = this.helperDateService.forward(
            today,
            this.helperDateService.createDuration({
                days: this.passwordPeriodInDays,
            })
        );
        const passwordEncrypted: string = this.encryptPassword(
            userId,
            password
        );

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            passwordPeriodExpired,
            passwordEncrypted,
        };
    }

    /** Reversibly encrypts the password with AES-256 keyed by user ID. */
    encryptPassword(userId: string, password: string): string {
        return this.helperEncryptionService.aes256EncryptSimple(
            password,
            userId
        );
    }

    decryptPassword(userId: string, encrypted: string): string {
        return this.helperEncryptionService.aes256DecryptSimple(
            encrypted,
            userId
        );
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
            if (
                this.helperHashService.bcryptCompare(password, history.password)
            ) {
                return history;
            }
        }

        return null;
    }

    getPasswordPeriodInDays(): number {
        return this.passwordPeriodInDays;
    }
}
