import { validateEmail } from '@common/request/validations/request.custom-email.validation';

describe('validateEmail', () => {
    it('rejects a value with no @-domain-dot shape', () => {
        expect(validateEmail('not-an-email')).toEqual({
            validated: false,
            messagePath: 'request.error.email.invalid',
        });
    });

    it('rejects a value carrying more than one @', () => {
        expect(validateEmail('user@sub@example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.multipleAtSymbols',
        });
    });

    it('rejects a domain longer than 253 characters', () => {
        const longDomain = `${'a'.repeat(250)}.com`;

        expect(validateEmail(`user@${longDomain}`)).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainLength',
        });
    });

    it('rejects a domain starting with a dash', () => {
        expect(validateEmail('user@-example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainDash',
        });
    });

    it('rejects a domain ending with a dash', () => {
        expect(validateEmail('user@example.com-')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainDash',
        });
    });

    it('rejects a domain starting with a dot', () => {
        expect(validateEmail('user@.example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainDot',
        });
    });

    it('rejects a domain ending with a dot', () => {
        expect(validateEmail('user@example.com.')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainDot',
        });
    });

    it('rejects a domain carrying consecutive dots', () => {
        expect(validateEmail('user@example..com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainConsecutiveDots',
        });
    });

    it('rejects a domain label longer than 63 characters', () => {
        const longLabel = 'a'.repeat(64);

        expect(validateEmail(`user@${longLabel}.com`)).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainLabelLength',
        });
    });

    it('rejects a domain label starting or ending with a dash', () => {
        expect(validateEmail('user@sub-.example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainLabelDash',
        });
    });

    it('rejects a domain label carrying a character outside [a-zA-Z0-9-]', () => {
        expect(validateEmail('user@exa_mple.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.domainInvalidChars',
        });
    });

    it('rejects a top-level domain outside [a-zA-Z]{2,}', () => {
        expect(validateEmail('user@example.c0m')).toEqual({
            validated: false,
            messagePath: 'request.error.email.invalidTLD',
        });
    });

    it('rejects a local part longer than 64 characters', () => {
        const longLocalPart = 'a'.repeat(65);

        expect(validateEmail(`${longLocalPart}@example.com`)).toEqual({
            validated: false,
            messagePath: 'request.error.email.localPartMaxLength',
        });
    });

    it('rejects a local part starting with a dot', () => {
        expect(validateEmail('.user@example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.localPartDot',
        });
    });

    it('rejects a local part ending with a dot', () => {
        expect(validateEmail('user.@example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.localPartDot',
        });
    });

    it('rejects a local part carrying consecutive dots', () => {
        expect(validateEmail('us..er@example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.consecutiveDots',
        });
    });

    it('rejects a local part carrying a character outside [a-zA-Z0-9-_.]', () => {
        expect(validateEmail('user!name@example.com')).toEqual({
            validated: false,
            messagePath: 'request.error.email.invalidChars',
        });
    });

    it('validates a well-formed email', () => {
        expect(validateEmail('user@example.com')).toEqual({
            validated: true,
        });
    });
});
