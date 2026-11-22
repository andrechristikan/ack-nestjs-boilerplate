import { RequestEmailSchema } from '@common/request/validations/request.email.validation';

describe('RequestEmailSchema', () => {
    it('rejects a value with no @-domain-dot shape', () => {
        expect(
            RequestEmailSchema.safeParse('not-an-email').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.invalid',
            }),
        ]);
    });

    it('rejects a value carrying more than one @', () => {
        expect(
            RequestEmailSchema.safeParse('user@sub@example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.multipleAtSymbols',
            }),
        ]);
    });

    it('rejects a domain longer than 253 characters', () => {
        const longDomain = `${'a'.repeat(250)}.com`;

        expect(
            RequestEmailSchema.safeParse(`user@${longDomain}`).error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainLength',
            }),
        ]);
    });

    it('rejects a domain starting with a dash', () => {
        expect(
            RequestEmailSchema.safeParse('user@-example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainDash',
            }),
        ]);
    });

    it('rejects a domain ending with a dash', () => {
        expect(
            RequestEmailSchema.safeParse('user@example.com-').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainDash',
            }),
        ]);
    });

    it('rejects a domain starting with a dot', () => {
        expect(
            RequestEmailSchema.safeParse('user@.example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainDot',
            }),
        ]);
    });

    it('rejects a domain ending with a dot', () => {
        expect(
            RequestEmailSchema.safeParse('user@example.com.').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainDot',
            }),
        ]);
    });

    it('rejects a domain carrying consecutive dots', () => {
        expect(
            RequestEmailSchema.safeParse('user@example..com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainConsecutiveDots',
            }),
        ]);
    });

    it('rejects a domain label longer than 63 characters', () => {
        const longLabel = 'a'.repeat(64);

        expect(
            RequestEmailSchema.safeParse(`user@${longLabel}.com`).error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainLabelLength',
            }),
        ]);
    });

    it('rejects a domain label starting or ending with a dash', () => {
        expect(
            RequestEmailSchema.safeParse('user@sub-.example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainLabelDash',
            }),
        ]);
    });

    it('rejects a domain label carrying a character outside [a-zA-Z0-9-]', () => {
        expect(
            RequestEmailSchema.safeParse('user@exa_mple.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.domainInvalidChars',
            }),
        ]);
    });

    it('rejects a top-level domain outside [a-zA-Z]{2,}', () => {
        expect(
            RequestEmailSchema.safeParse('user@example.c0m').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.invalidTLD',
            }),
        ]);
    });

    it('rejects a local part longer than 64 characters', () => {
        const longLocalPart = 'a'.repeat(65);

        expect(
            RequestEmailSchema.safeParse(`${longLocalPart}@example.com`).error
                ?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.localPartMaxLength',
            }),
        ]);
    });

    it('rejects a local part starting with a dot', () => {
        expect(
            RequestEmailSchema.safeParse('.user@example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.localPartDot',
            }),
        ]);
    });

    it('rejects a local part ending with a dot', () => {
        expect(
            RequestEmailSchema.safeParse('user.@example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.localPartDot',
            }),
        ]);
    });

    it('rejects a local part carrying consecutive dots', () => {
        expect(
            RequestEmailSchema.safeParse('us..er@example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.consecutiveDots',
            }),
        ]);
    });

    it('rejects a local part carrying a character outside [a-zA-Z0-9-_.]', () => {
        expect(
            RequestEmailSchema.safeParse('user!name@example.com').error?.issues
        ).toEqual([
            expect.objectContaining({
                code: 'custom',
                message: 'request.error.email.invalidChars',
            }),
        ]);
    });

    it('validates a well-formed email', () => {
        expect(RequestEmailSchema.safeParse('user@example.com').success).toBe(
            true
        );
    });
});
