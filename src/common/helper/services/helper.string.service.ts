import {
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { RequestPasswordStrengthRegex } from '@common/request/constants/request.constant';
import { IHelperStringService } from '@common/helper/interfaces/helper.string.service.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelperStringService implements IHelperStringService {
    random(length: number): string {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            result += characters[Math.floor(Math.random() * characters.length)];
        }

        return result;
    }

    generateSlug(prefix: string, maxLength: number): string {
        const randomLength = maxLength - prefix.length;
        return `${prefix}${this.random(randomLength)}`;
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

            try {
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
                        normalizedPath.startsWith(basePattern + '/')
                    );
                }

                const regexPattern = normalizedPattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');

                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(normalizedPath);
            } catch {
                return false;
            }
        });
    }
}
