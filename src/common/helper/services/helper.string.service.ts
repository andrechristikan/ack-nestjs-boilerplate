import { Injectable } from '@nestjs/common';
import {
    IHelperEmailValidation,
    IHelperStringPasswordOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { IHelperStringService } from 'src/common/helper/interfaces/helper.string-service.interface';

@Injectable()
export class HelperStringService implements IHelperStringService {
    randomReference(length: number): string {
        const timestamp = `${new Date().getTime()}`;
        const randomString: string = this.random(length);

        return `${timestamp}${randomString}`.toUpperCase();
    }

    random(length: number): string {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let counter = 0;
        while (counter < length) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );

            counter += 1;
        }

        return result;
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
        options?: IHelperStringPasswordOptions
    ): boolean {
        const length = options?.length ?? 8;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    formatCurrency(num: number, locale: string): string {
        return num.toLocaleString(locale);
    }

    checkCustomEmail(value: string): IHelperEmailValidation {
        const valid = /\S+@\S+\.\S+/.test(value);
        if (!valid) {
            return {
                validated: false,
                messagePath: 'request.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) || []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        // Add minimum length check for local part
        if (!localPart || localPart.length === 0) {
            return {
                validated: false,
                messagePath: 'request.email.localPartNotEmpty',
            };
        } else if (!domain || domain.length > 255) {
            return {
                validated: false,
                messagePath: 'request.email.domainLength',
            };
        } else if (localPart.length > 64) {
            return {
                validated: false,
                messagePath: 'request.email.localPartMaxLength',
            };
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.email.localPartDot',
            };
        } else if (localPart.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.email.consecutiveDots',
            };
        }

        const allowedLocalPartChars = /^[a-zA-Z0-9-_.]+$/;
        if (!allowedLocalPartChars.test(localPart)) {
            return {
                validated: false,
                messagePath: 'request.email.invalidChars',
            };
        }

        return {
            validated: true,
        };
    }

    checkWildcardUrl(url: string, patterns: string[]): boolean {
        if (patterns.includes(url)) {
            return true;
        }

        return patterns.some(pattern => {
            if (pattern.includes('*')) {
                try {
                    // Convert wildcard pattern to regex pattern
                    const regexPattern = pattern
                        .replace(/\./g, '\\.') // Escape dots
                        .replace(/\*/g, '.*'); // Replace * with .*

                    // Create regex and test URL
                    const regex = new RegExp(`^${regexPattern}$`);
                    return regex.test(url);
                } catch {
                    return false;
                }
            }
            return false;
        });
    }
}
