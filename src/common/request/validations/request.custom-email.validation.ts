import { IHelperEmailValidation } from '@common/helper/interfaces/helper.interface';

export function validateEmail(value: string): IHelperEmailValidation {
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
