import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';
import { AuthPasswordContextWordException } from '@modules/auth/exceptions/auth.password-context-word.exception';
import { AuthCommonPasswordRepository } from '@modules/auth/repositories/auth.common-password.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthPasswordService {
    private readonly contextWordMinLength: number;

    constructor(
        private readonly authCommonPasswordRepository: AuthCommonPasswordRepository,
        private readonly configService: ConfigService
    ) {
        this.contextWordMinLength = this.configService.get<number>(
            'auth.password.contextWordMinLength'
        )!;
    }

    /** Throws when the password contains a context word, then when it is on the common-password list; the match ignores letter case. */
    async assertAllowed(
        password: string,
        contextWords: string[]
    ): Promise<void> {
        const lowered = password.toLowerCase();
        const words = contextWords
            .flatMap(contextWord =>
                contextWord.toLowerCase().split(/[^\p{L}\p{N}]+/u)
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
