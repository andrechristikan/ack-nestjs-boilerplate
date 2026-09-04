import {
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
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
        const length = options?.length ?? 8;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    checkEmail(value: string): IHelperEmailValidation {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        const valid = regex.test(value);
        if (!valid) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) ?? []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.error.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        if (!domain || domain.length > 253) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainLength',
            };
        } else if (domain.startsWith('-') || domain.endsWith('-')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDash',
            };
        } else if (domain.startsWith('.') || domain.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDot',
            };
        } else if (domain.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainConsecutiveDots',
            };
        }

        const domainLabels = domain.split('.');
        if (domainLabels.length < 2) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainFormat',
            };
        }

        for (const label of domainLabels) {
            if (label.length === 0) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainEmptyLabel',
                };
            } else if (label.length > 63) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelLength',
                };
            } else if (label.startsWith('-') || label.endsWith('-')) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelDash',
                };
            }

            const validLabelChars = /^[a-zA-Z0-9-]+$/;
            if (!validLabelChars.test(label)) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainInvalidChars',
                };
            }
        }

        const tld = domainLabels[domainLabels.length - 1];
        const validTLD = /^[a-zA-Z]{2,}$/;
        if (!validTLD.test(tld)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidTLD',
            };
        }

        if (!localPart || localPart.length === 0) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartNotEmpty',
            };
        } else if (localPart.length > 64) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartMaxLength',
            };
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartDot',
            };
        } else if (localPart.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.consecutiveDots',
            };
        }

        const allowedLocalPartChars = /^[a-zA-Z0-9-_.]+$/;
        if (!allowedLocalPartChars.test(localPart)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidChars',
            };
        }

        return {
            validated: true,
        };
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
