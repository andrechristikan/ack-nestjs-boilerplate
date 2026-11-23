import {
    HelperStringAlphanumericCharacters,
    HelperStringLeadingSlashesRegex,
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

    private keepEnds(text: string): string {
        if (text.length <= 6) {
            return '*'.repeat(text.length);
        }

        return `${text.slice(0, 4)}${'*'.repeat(text.length - 6)}${text.slice(-2)}`;
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

    stripLeadingSlashes(path: string): string {
        return path.replace(HelperStringLeadingSlashesRegex, '');
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

    censorMobileNumber(mobileNumber: string): string {
        return this.keepEnds(mobileNumber);
    }

    censorEmail(email: string): string {
        const at = email.lastIndexOf('@');
        const local = email.slice(0, at);
        const domain = email.slice(at + 1);

        const maskedLocal = this.keepEnds(local);

        return `${maskedLocal}@${domain.slice(0, 1)}${'*'.repeat(domain.length - 1)}`;
    }
}
