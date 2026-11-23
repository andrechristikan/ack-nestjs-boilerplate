import {
    RequestEmailDomainLabelRegex,
    RequestEmailFormatRegex,
    RequestEmailLocalPartRegex,
    RequestEmailTldRegex,
} from '@common/request/constants/request.constant';
import { z } from 'zod';

/** @public */
export const RequestEmailSchema = z.string().superRefine((value, ctx) => {
    if (!RequestEmailFormatRegex.test(value)) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.invalid',
        });
        return;
    }

    if (value.split('@').length - 1 !== 1) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.multipleAtSymbols',
        });
        return;
    }

    const [localPart, domain] = value.split('@') as [string, string];

    if (domain.length > 253) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.domainLength',
        });
        return;
    }

    if (domain.startsWith('-') || domain.endsWith('-')) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.domainDash',
        });
        return;
    }

    if (domain.startsWith('.') || domain.endsWith('.')) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.domainDot',
        });
        return;
    }

    if (domain.includes('..')) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.domainConsecutiveDots',
        });
        return;
    }

    const domainLabels = domain.split('.');

    for (const label of domainLabels) {
        if (label.length > 63) {
            ctx.addIssue({
                code: 'custom',
                message: 'request.error.email.domainLabelLength',
            });
            return;
        }

        if (label.startsWith('-') || label.endsWith('-')) {
            ctx.addIssue({
                code: 'custom',
                message: 'request.error.email.domainLabelDash',
            });
            return;
        }

        if (!RequestEmailDomainLabelRegex.test(label)) {
            ctx.addIssue({
                code: 'custom',
                message: 'request.error.email.domainInvalidChars',
            });
            return;
        }
    }

    const tld = domainLabels[domainLabels.length - 1]!;
    if (!RequestEmailTldRegex.test(tld)) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.invalidTld',
        });
        return;
    }

    if (localPart.length > 64) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.localPartMaxLength',
        });
        return;
    }

    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.localPartDot',
        });
        return;
    }

    if (localPart.includes('..')) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.consecutiveDots',
        });
        return;
    }

    if (!RequestEmailLocalPartRegex.test(localPart)) {
        ctx.addIssue({
            code: 'custom',
            message: 'request.error.email.invalidChars',
        });
    }
});
