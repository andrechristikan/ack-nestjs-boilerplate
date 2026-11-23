import { AuthPasswordContextWordSeparatorRegex } from '@modules/auth/constants/auth.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';
import { AuthPasswordContextWordException } from '@modules/auth/exceptions/auth.password-context-word.exception';
import type {
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthPasswordTemporary,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCommonPasswordRepository } from '@modules/auth/repositories/auth.common-password.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthPasswordService {
    private readonly contextWordMinLength: number;
    private readonly temporaryExpiresInMs: number;
    private readonly periodInDays: number;
    private readonly temporaryLength: number;

    constructor(
        private readonly authCommonPasswordRepository: AuthCommonPasswordRepository,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.contextWordMinLength = this.configService.get<number>(
            'auth.password.contextWordMinLength'
        )!;
        this.temporaryExpiresInMs = this.configService.get<number>(
            'auth.password.temporaryExpiresInMs'
        )!;
        this.periodInDays = this.configService.get<number>(
            'auth.password.periodInDays'
        )!;
        this.temporaryLength = this.configService.get<number>(
            'auth.password.temporaryLength'
        )!;
    }

    async create(
        password: string,
        options: IAuthPasswordOptions
    ): Promise<IAuthPasswordTemporary>;
    async create(password: string): Promise<IAuthPassword>;
    async create(
        password: string,
        options?: IAuthPasswordOptions
    ): Promise<IAuthPassword> {
        const today = this.helperDateService.create();
        let passwordExpired: Date | null = null;
        if (options?.temporary) {
            const passwordExpiredDuration =
                this.helperDateService.createDuration({
                    milliseconds: this.temporaryExpiresInMs,
                });
            passwordExpired = this.helperDateService.forward(
                today,
                passwordExpiredDuration
            );
        }
        const passwordHash = await this.helperHashService.argon2Hash(password);
        const passwordPeriodDuration = this.helperDateService.createDuration({
            days: this.periodInDays,
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

    createRandom(): string {
        return this.helperStringService.random(this.temporaryLength);
    }

    /** Throws when the password contains a context word, then when it is on the common-password list; the match ignores letter case. */
    async assertAllowed(
        password: string,
        contextWords: string[]
    ): Promise<void> {
        const lowered = password.toLowerCase();
        const words = contextWords
            .flatMap(contextWord =>
                contextWord
                    .toLowerCase()
                    .split(AuthPasswordContextWordSeparatorRegex)
            )
            .filter(word => word.length >= this.contextWordMinLength);
        const hasContextWord = words.some(word => lowered.includes(word));
        if (hasContextWord) {
            throw new AuthPasswordContextWordException();
        }

        const isCommon =
            await this.authCommonPasswordRepository.existsByValue(lowered);
        if (isCommon) {
            throw new AuthPasswordCommonException();
        }
    }
}
