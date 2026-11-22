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

    describe('stripLeadingSlashes', () => {
        it('strips every leading slash', () => {
            expect(service.stripLeadingSlashes('//a/b')).toBe('a/b');
        });

        it('leaves a path without a leading slash unchanged', () => {
            expect(service.stripLeadingSlashes('a/b/')).toBe('a/b/');
        });
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

        it('returns only lower-case letters, digits, and hyphens', () => {
            for (let i = 0; i < 100; i++) {
                expect(service.generateSlug('user-', 30)).toMatch(
                    /^[0-9a-z-]+$/
                );
            }
        });

        it('lower-cases the prefix', () => {
            expect(service.generateSlug('Ws-', 10).startsWith('ws-')).toBe(
                true
            );
        });
    });

    describe('generateSlugCandidates', () => {
        it('returns count slugs each starting with the prefix and sized to the max length', () => {
            const result = service.generateSlugCandidates('ws-', 10, 4);

            expect(result).toHaveLength(4);
            for (const slug of result) {
                expect(slug).toHaveLength(10);
                expect(slug.startsWith('ws-')).toBe(true);
            }
        });

        it('returns an empty list for a zero count', () => {
            expect(service.generateSlugCandidates('ws-', 10, 0)).toEqual([]);
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

    describe('censorMobileNumber', () => {
        it('keeps the first 4 and the last 2 characters', () => {
            expect(service.censorMobileNumber('+6281234567890')).toBe(
                '+628********90'
            );
        });

        it('masks every character of a value of 6 characters or fewer', () => {
            expect(service.censorMobileNumber('081234')).toBe('******');
        });

        it('keeps the length of the input', () => {
            expect(service.censorMobileNumber('+6281234567890')).toHaveLength(
                14
            );
        });
    });

    describe('censorEmail', () => {
        it('keeps the first 4 and last 2 characters of the local part and the first character of the domain', () => {
            expect(service.censorEmail('andre.christikan@gmail.com')).toBe(
                'andr**********an@g********'
            );
        });

        it('masks the whole local part of 6 characters or fewer and keeps the at sign', () => {
            expect(service.censorEmail('ab@x.io')).toBe('**@x***');
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
});
