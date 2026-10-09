import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

describe('HelperStringService', () => {
    let service: HelperStringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperStringService],
        }).compile();

        service = module.get(HelperStringService);
    });

    describe('random', () => {
        it('generates an alphanumeric string of the requested length', () => {
            const result = service.random(12);

            expect(result).toHaveLength(12);
            expect(/^[A-Za-z0-9]+$/.test(result)).toBe(true);
        });
    });

    describe('randomUppercase', () => {
        it('generates an uppercase alphanumeric string of the requested length', () => {
            const result = service.randomUppercase(12);

            expect(result).toHaveLength(12);
            expect(/^[A-Z0-9]+$/.test(result)).toBe(true);
        });
    });

    describe('fillPattern', () => {
        it('fills every token in one pass', () => {
            const result = service.fillPattern('{greeting}, {name}!', {
                greeting: 'Hello',
                name: 'World',
            });

            expect(result).toBe('Hello, World!');
        });

        it('does not re-read a substituted value as a token', () => {
            const result = service.fillPattern('{a}', { a: '{b}', b: 'x' });

            expect(result).toBe('{b}');
        });

        it('throws when a token has no matching value', () => {
            let error: unknown;
            try {
                service.fillPattern('{missing}', {});
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.patternTokenMissing,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.patternTokenMissing
                    ],
                messagePath: 'helper.error.patternTokenMissing',
                messageProperties: { token: 'missing' },
            });
        });
    });

    describe('generateSlug', () => {
        it('appends a random suffix up to the max length', () => {
            const result = service.generateSlug('user-', 10);

            expect(result).toHaveLength(10);
            expect(result.startsWith('user-')).toBe(true);
        });
    });

    describe('censor', () => {
        it('masks all but the last character for a string of 5 or fewer characters', () => {
            expect(service.censor('abcde')).toBe('****e');
        });

        it('masks the middle, keeping the last 3 characters for 6 to 10 characters', () => {
            expect(service.censor('abcdefgh')).toBe('*****fgh');
        });

        it('masks a fixed 10-character span, keeping the first 3 and last 4 for longer strings', () => {
            expect(service.censor('abcdefghijkl')).toBe('abc**********ijkl');
        });
    });

    describe('checkPasswordStrength', () => {
        it('returns true for a password meeting the default length and strength', () => {
            expect(service.checkPasswordStrength('Password1')).toBe(true);
        });

        it('returns false for a password shorter than the given length', () => {
            expect(service.checkPasswordStrength('Pw0', { length: 8 })).toBe(
                false
            );
        });

        it('returns false for a password missing a required character class', () => {
            expect(service.checkPasswordStrength('password1')).toBe(false);
        });
    });

    describe('checkUrlMatchesPatterns', () => {
        it('returns false when the url is empty', () => {
            expect(service.checkUrlMatchesPatterns('', ['/a'])).toBe(false);
        });

        it('returns false when no patterns are given', () => {
            expect(service.checkUrlMatchesPatterns('/a', [])).toBe(false);
        });

        it('falls back to a manual path split when the url is not a valid URL', () => {
            expect(
                service.checkUrlMatchesPatterns('/a/b?x=1#f', ['/a/b'])
            ).toBe(true);
        });

        it('matches an exact path parsed from a full URL', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a/b', [
                    '/a/b',
                ])
            ).toBe(true);
        });

        it('skips a falsy pattern in the list', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a', [
                    '',
                    '/a',
                ])
            ).toBe(true);
        });

        it('returns false when the pattern carries no wildcard and does not match exactly', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a', ['/b'])
            ).toBe(false);
        });

        it('matches any path against a bare wildcard', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a/b', ['*'])
            ).toBe(true);
        });

        it('matches every path under a trailing-slash wildcard prefix', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a/b', [
                    '/a/*',
                ])
            ).toBe(true);
        });

        it('does not match the bare base path for a trailing-slash wildcard prefix', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/a', ['/a/*'])
            ).toBe(false);
        });

        it('does not match a sibling path for a trailing-slash wildcard prefix', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/ab', ['/a/*'])
            ).toBe(false);
        });

        it('matches a wildcard prefix with no trailing slash against the exact base', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/api', [
                    '/api*',
                ])
            ).toBe(true);
        });

        it('matches a wildcard prefix with no trailing slash against a nested path', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/api/v1', [
                    '/api*',
                ])
            ).toBe(true);
        });

        it('does not match a wildcard prefix against an unrelated sibling path', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/apix', [
                    '/api*',
                ])
            ).toBe(false);
        });

        it('matches a glob pattern with a leading and trailing segment', () => {
            expect(
                service.checkUrlMatchesPatterns(
                    'https://host.com/api/user/1/profile',
                    ['/api/*/profile']
                )
            ).toBe(true);
        });

        it('rejects a glob pattern shorter than the head and tail combined', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/ap', [
                    '/api/*/profile',
                ])
            ).toBe(false);
        });

        it('rejects a glob pattern whose path does not start with the head', () => {
            expect(
                service.checkUrlMatchesPatterns(
                    'https://host.com/other/user/1/profile',
                    ['/api/*/profile']
                )
            ).toBe(false);
        });

        it('rejects a glob pattern whose path does not end with the tail', () => {
            expect(
                service.checkUrlMatchesPatterns(
                    'https://host.com/api/user/1/other',
                    ['/api/*/profile']
                )
            ).toBe(false);
        });

        it('matches every middle segment of a multi-wildcard glob in order', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/abcd', [
                    '/a*b*c*d',
                ])
            ).toBe(true);
        });

        it('rejects a multi-wildcard glob whose middle segments appear out of order', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/acxbd', [
                    '/a*b*c*d',
                ])
            ).toBe(false);
        });

        it('rejects a multi-wildcard glob whose middle segment only fits inside the tail', () => {
            expect(
                service.checkUrlMatchesPatterns('https://host.com/aXzz', [
                    '/a*z*zz',
                ])
            ).toBe(false);
        });
    });

    describe('randomFrom', () => {
        it('builds a string of the requested length using only the given character set', () => {
            expect(service['randomFrom']('a', 5)).toBe('aaaaa');
        });

        it('returns an empty string when length is zero', () => {
            expect(service['randomFrom']('abc', 0)).toBe('');
        });

        it('draws every character from the given character set', () => {
            const result = service['randomFrom']('xy', 20);

            expect(result).toHaveLength(20);
            expect(/^[xy]+$/.test(result)).toBe(true);
        });
    });

    describe('matchesGlob', () => {
        it('returns false when the path is shorter than the head and tail combined', () => {
            expect(service['matchesGlob']('/ap', '/api/*/profile')).toBe(false);
        });

        it('returns false when the path does not start with the head', () => {
            expect(
                service['matchesGlob'](
                    '/other/user/1/profile',
                    '/api/*/profile'
                )
            ).toBe(false);
        });

        it('returns false when the path does not end with the tail', () => {
            expect(
                service['matchesGlob']('/api/user/1/other', '/api/*/profile')
            ).toBe(false);
        });

        it('returns true for a single wildcard segment matched in between', () => {
            expect(
                service['matchesGlob']('/api/user/1/profile', '/api/*/profile')
            ).toBe(true);
        });

        it('matches every middle segment of a multi-wildcard glob in order', () => {
            expect(service['matchesGlob']('/abcd', '/a*b*c*d')).toBe(true);
        });

        it('rejects a multi-wildcard glob whose middle segments appear out of order', () => {
            expect(service['matchesGlob']('/13924', '/1*2*3*4')).toBe(false);
        });

        it('rejects a multi-wildcard glob whose middle segment only fits inside the tail', () => {
            expect(service['matchesGlob']('/aXzz', '/a*z*zz')).toBe(false);
        });
    });
});
