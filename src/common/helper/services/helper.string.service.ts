import type {
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { RequestPasswordStrengthRegex } from '@common/request/constants/request.constant';
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

    private matchesGlob(path: string, pattern: string): boolean {
        const segments = pattern.split('*');
        const head = segments[0];
        const tail = segments[segments.length - 1];
        if (
            path.length < head.length + tail.length ||
            !path.startsWith(head) ||
            !path.endsWith(tail)
        ) {
            return false;
        }

        const end = path.length - tail.length;
        let position = head.length;
        for (const segment of segments.slice(1, -1)) {
            const index = path.indexOf(segment, position);
            if (index === -1 || index + segment.length > end) {
                return false;
            }

            position = index + segment.length;
        }

        return true;
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

    /** Fills every `{token}` of a pattern in ONE pass, so a substituted value is never read again as a token. */
    fillPattern(pattern: string, values: Record<string, string>): string {
        return pattern.replace(
            HelperStringPatternTokenRegex,
            (_match, token: string) => {
                if (!Object.hasOwn(values, token)) {
                    throw new HelperPatternTokenMissingException(token);
                }

                return values[token];
            }
        );
    }

    generateSlug(prefix: string, maxLength: number): string {
        const randomLength = maxLength - prefix.length;
        const randomSuffix = this.random(randomLength);

        return `${prefix}${randomSuffix}`;
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

    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean {
        return (
            password.length >= (options?.length ?? 8) &&
            RequestPasswordStrengthRegex.test(password)
        );
    }

    checkEmail(value: string): IHelperEmailValidation {
        return validateEmail(value);
    }

    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean {
        if (!url || !patterns?.length) {
            return false;
        }

        let pathname: string;
        try {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
        } catch {
            pathname = url.split('?')[0].split('#')[0];
        }

        const normalizedPath = pathname.toLowerCase();

        return patterns.some(pattern => {
            if (!pattern) {
                return false;
            }

            const normalizedPattern = pattern.toLowerCase();

            if (normalizedPath === normalizedPattern) {
                return true;
            }

            if (!pattern.includes('*')) {
                return false;
            }

            if (normalizedPattern === '*') {
                return true;
            }

            if (normalizedPattern.endsWith('*')) {
                const basePattern = normalizedPattern.slice(0, -1);

                if (!basePattern) {
                    return true;
                }

                if (basePattern.endsWith('/')) {
                    return normalizedPath.startsWith(basePattern);
                }

                return (
                    normalizedPath === basePattern ||
                    normalizedPath.startsWith(`${basePattern}/`)
                );
            }

            return this.matchesGlob(normalizedPath, normalizedPattern);
        });
    }
}
