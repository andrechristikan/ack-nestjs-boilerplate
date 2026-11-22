import {
    HelperStringAlphanumericCharacters,
    HelperStringPatternTokenRegex,
    HelperStringUppercaseAlphanumericCharacters,
} from '@common/helper/constants/helper.constant';
import { HelperPatternTokenMissingException } from '@common/helper/exceptions/helper.pattern-token-missing.exception';
import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class HelperStringService {
    private randomFrom(characters: string, length: number): string {
        let result = '';

        for (let i = 0; i < length; i++) {
            result += characters[randomInt(characters.length)];
        }

        return result;
    }

    random(length: number): string {
        return this.randomFrom(HelperStringAlphanumericCharacters, length);
    }

    randomUppercase(length: number): string {
        return this.randomFrom(
            HelperStringUppercaseAlphanumericCharacters,
            length
        );
    }

    fillPattern(pattern: string, values: Record<string, string>): string {
        return pattern.replace(
            HelperStringPatternTokenRegex,
            (_match, token: string) => {
                if (!Object.hasOwn(values, token)) {
                    throw new HelperPatternTokenMissingException(token);
                }

                return values[token]!;
            }
        );
    }

    generateSlug(prefix: string, maxLength: number): string {
        const randomLength = maxLength - prefix.length;
        const randomSuffix = this.random(randomLength);

        return `${prefix}${randomSuffix}`.toLowerCase();
    }

    generateSlugCandidates(
        prefix: string,
        maxLength: number,
        count: number
    ): string[] {
        return Array.from({ length: count }, () =>
            this.generateSlug(prefix, maxLength)
        );
    }

    censor(text: string): string {
        if (text.length <= 5) {
            const stringCensor = '*'.repeat(text.length - 1);
            return `${stringCensor}${text.slice(-1)}`;
        } else if (text.length <= 10) {
            const stringCensor = '*'.repeat(text.length - 3);
            return `${stringCensor}${text.slice(-3)}`;
        }

        const stringCensor = '*'.repeat(10);
        return `${text.slice(0, 3)}${stringCensor}${text.slice(-4)}`;
    }
}
