import { afterEach, describe, expect, it, vi } from 'vitest';

import { HelperStringService } from '@common/helper/services/helper.string.service';

describe('HelperStringService', () => {
    const service = new HelperStringService();

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('random', () => {
        it('returns an alphanumeric string of the requested length', () => {
            expect(service.random(32)).toMatch(/^[A-Za-z0-9]{32}$/);
        });

        it('returns an empty string for length 0', () => {
            expect(service.random(0)).toBe('');
        });

        it('uses only the configured alphanumeric alphabet', () => {
            expect(service.random(64)).toMatch(/^[A-Za-z0-9]{64}$/);
        });
    });

    describe('generateSlug', () => {
        it('pads the prefix with random chars up to maxLength', () => {
            const slug = service.generateSlug('ws-', 10);

            expect(slug).toMatch(/^ws-[A-Za-z0-9]{7}$/);
        });
    });

    describe('censor', () => {
        it.each([
            ['abcde', '****e'],
            ['a', 'a'],
            ['abcdefghij', '*******hij'],
            ['abcdef', '***def'],
            ['abcdefghijklmn', 'abc**********klmn'],
        ])('censor(%j) is %j', (text, expected) => {
            expect(service.censor(text)).toBe(expected);
        });
    });

    describe('checkPasswordStrength', () => {
        it('accepts a long mixed password', () => {
            expect(service.checkPasswordStrength('Abcdef1!')).toBe(true);
        });

        it('rejects a password shorter than the default 8', () => {
            expect(service.checkPasswordStrength('Ab1!')).toBe(false);
        });

        it('rejects a long password missing complexity', () => {
            expect(service.checkPasswordStrength('abcdefghij')).toBe(false);
        });

        it('honours a custom minimum length', () => {
            expect(
                service.checkPasswordStrength('Abcdef1!', { length: 12 })
            ).toBe(false);
        });
    });

    describe('checkEmail', () => {
        it('delegates to the email validation', () => {
            expect(service.checkEmail('user@example.com').validated).toBe(true);
            expect(service.checkEmail('not-an-email').validated).toBe(false);
        });
    });

    describe('checkUrlMatchesPatterns', () => {
        it.each([
            ['empty url', '', ['/a'], false],
            ['no patterns', '/a', [], false],
            ['exact match', '/api/users', ['/api/users'], true],
            ['case-insensitive', '/API/Users', ['/api/users'], true],
            [
                'full URL pathname',
                'https://x.io/api/users?q=1',
                ['/api/users'],
                true,
            ],
            [
                'relative url with query',
                '/api/users?q=1#h',
                ['/api/users'],
                true,
            ],
            ['no match without wildcard', '/api/users', ['/api'], false],
            ['empty pattern skipped', '/api', ['', '/api'], true],
            ['only empty pattern', '/api', [''], false],
            ['lone wildcard', '/anything', ['*'], true],
            ['trailing /* prefix', '/api/users/1', ['/api/*'], true],
            ['trailing /* miss', '/other/users', ['/api/*'], false],
            ['trailing * base itself', '/api', ['/api*'], true],
            ['trailing * base child', '/api/x', ['/api*'], true],
            ['trailing * sibling prefix rejected', '/apix', ['/api*'], false],
            ['middle wildcard', '/api/v1/users', ['/api/*/users'], true],
            ['middle wildcard miss', '/api/v1/other', ['/api/*/users'], false],
            ['regex dot is literal', '/aXb/1/x', ['/a.b/*/x'], false],
        ])('%s', (_name, url, patterns, expected) => {
            expect(service.checkUrlMatchesPatterns(url, patterns)).toBe(
                expected
            );
        });

        it('returns false for a null pattern list', () => {
            expect(
                service.checkUrlMatchesPatterns(
                    '/a',
                    null as unknown as string[]
                )
            ).toBe(false);
        });
    });
});
