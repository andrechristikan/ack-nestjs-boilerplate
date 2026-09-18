import { describe, expect, it } from 'vitest';

import { validateEmail } from '@common/request/validations/request.custom-email.validation';

describe('validateEmail', () => {
    it('accepts a conventional email address', () => {
        expect(validateEmail('ada.lovelace@example.com')).toEqual({
            validated: true,
        });
    });

    it.each([
        ['', 'request.error.email.invalid'],
        ['a@b@example.com', 'request.error.email.multipleAtSymbols'],
        ['a@-example.com', 'request.error.email.domainDash'],
        ['a@example..com', 'request.error.email.domainConsecutiveDots'],
        ['a@example.c', 'request.error.email.invalidTLD'],
        ['.ada@example.com', 'request.error.email.localPartDot'],
        ['ada..lovelace@example.com', 'request.error.email.consecutiveDots'],
        ['ada+tag@example.com', 'request.error.email.invalidChars'],
    ])(
        'rejects %s with the owned validation category',
        (value, messagePath) => {
            expect(validateEmail(value)).toEqual({
                validated: false,
                messagePath,
            });
        }
    );
});
