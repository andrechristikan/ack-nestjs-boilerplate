import { LoggerUrlUtil } from '@common/logger/utils/logger.url.util';
import { LoggerRedactedValue } from '@common/logger/constants/logger.constant';

describe('LoggerUrlUtil', () => {
    let util: LoggerUrlUtil;

    beforeEach(() => {
        util = new LoggerUrlUtil();
    });

    describe('maskUrl', () => {
        it('masks the pathname of a parseable absolute url', () => {
            const result = util.maskUrl(
                'https://host.com/api/user/507f1f77bcf86cd799439011'
            );

            expect(result).toBe(
                `https://host.com/api/user/${LoggerRedactedValue}`
            );
        });

        it('falls back to a manual split for a url that fails to parse', () => {
            const result = util.maskUrl(
                '/api/user/507f1f77bcf86cd799439011?x=1#f'
            );

            expect(result).toBe(`/api/user/${LoggerRedactedValue}`);
        });
    });

    describe('matchesPatterns', () => {
        it('returns false when the url is empty', () => {
            expect(util.matchesPatterns('', ['/a'])).toBe(false);
        });

        it('returns false when no patterns are given', () => {
            expect(util.matchesPatterns('/a', [])).toBe(false);
        });

        it('falls back to a manual path split when the url is not a valid URL', () => {
            expect(util.matchesPatterns('/a/b?x=1#f', ['/a/b'])).toBe(true);
        });

        it('matches an exact path parsed from a full URL', () => {
            expect(util.matchesPatterns('https://host.com/a/b', ['/a/b'])).toBe(
                true
            );
        });

        it('skips a falsy pattern in the list', () => {
            expect(util.matchesPatterns('https://host.com/a', ['', '/a'])).toBe(
                true
            );
        });

        it('returns false when the pattern carries no wildcard and does not match exactly', () => {
            expect(util.matchesPatterns('https://host.com/a', ['/b'])).toBe(
                false
            );
        });

        it('matches any path against a bare wildcard', () => {
            expect(util.matchesPatterns('https://host.com/a/b', ['*'])).toBe(
                true
            );
        });

        it('matches every path under a trailing-slash wildcard prefix', () => {
            expect(util.matchesPatterns('https://host.com/a/b', ['/a/*'])).toBe(
                true
            );
        });

        it('does not match the bare base path for a trailing-slash wildcard prefix', () => {
            expect(util.matchesPatterns('https://host.com/a', ['/a/*'])).toBe(
                false
            );
        });

        it('does not match a sibling path for a trailing-slash wildcard prefix', () => {
            expect(util.matchesPatterns('https://host.com/ab', ['/a/*'])).toBe(
                false
            );
        });

        it('matches a wildcard prefix with no trailing slash against the exact base', () => {
            expect(
                util.matchesPatterns('https://host.com/api', ['/api*'])
            ).toBe(true);
        });

        it('matches a wildcard prefix with no trailing slash against a nested path', () => {
            expect(
                util.matchesPatterns('https://host.com/api/v1', ['/api*'])
            ).toBe(true);
        });

        it('does not match a wildcard prefix against an unrelated sibling path', () => {
            expect(
                util.matchesPatterns('https://host.com/apix', ['/api*'])
            ).toBe(false);
        });

        it('matches a glob pattern with a leading and trailing segment', () => {
            expect(
                util.matchesPatterns('https://host.com/api/user/1/profile', [
                    '/api/*/profile',
                ])
            ).toBe(true);
        });

        it('rejects a glob pattern shorter than the head and tail combined', () => {
            expect(
                util.matchesPatterns('https://host.com/ap', ['/api/*/profile'])
            ).toBe(false);
        });

        it('rejects a glob pattern whose path does not start with the head', () => {
            expect(
                util.matchesPatterns('https://host.com/other/user/1/profile', [
                    '/api/*/profile',
                ])
            ).toBe(false);
        });

        it('rejects a glob pattern whose path does not end with the tail', () => {
            expect(
                util.matchesPatterns('https://host.com/api/user/1/other', [
                    '/api/*/profile',
                ])
            ).toBe(false);
        });

        it('matches every middle segment of a multi-wildcard glob in order', () => {
            expect(
                util.matchesPatterns('https://host.com/abcd', ['/a*b*c*d'])
            ).toBe(true);
        });

        it('rejects a multi-wildcard glob whose middle segments appear out of order', () => {
            expect(
                util.matchesPatterns('https://host.com/acxbd', ['/a*b*c*d'])
            ).toBe(false);
        });

        it('rejects a multi-wildcard glob whose middle segment only fits inside the tail', () => {
            expect(
                util.matchesPatterns('https://host.com/aXzz', ['/a*z*zz'])
            ).toBe(false);
        });
    });

    describe('matchesGlob', () => {
        it('returns false when the path is shorter than the head and tail combined', () => {
            expect(util['matchesGlob']('/ap', '/api/*/profile')).toBe(false);
        });

        it('returns false when the path does not start with the head', () => {
            expect(
                util['matchesGlob']('/other/user/1/profile', '/api/*/profile')
            ).toBe(false);
        });

        it('returns false when the path does not end with the tail', () => {
            expect(
                util['matchesGlob']('/api/user/1/other', '/api/*/profile')
            ).toBe(false);
        });

        it('returns true for a single wildcard segment matched in between', () => {
            expect(
                util['matchesGlob']('/api/user/1/profile', '/api/*/profile')
            ).toBe(true);
        });

        it('matches every middle segment of a multi-wildcard glob in order', () => {
            expect(util['matchesGlob']('/abcd', '/a*b*c*d')).toBe(true);
        });

        it('rejects a multi-wildcard glob whose middle segments appear out of order', () => {
            expect(util['matchesGlob']('/13924', '/1*2*3*4')).toBe(false);
        });

        it('rejects a multi-wildcard glob whose middle segment only fits inside the tail', () => {
            expect(util['matchesGlob']('/aXzz', '/a*z*zz')).toBe(false);
        });
    });

    describe('maskPath', () => {
        it('keeps an empty segment', () => {
            expect(util['maskPath']('/')).toBe('/');
        });

        it('keeps a route parameter segment', () => {
            expect(util['maskPath']('/:userId')).toBe('/:userId');
        });

        it('keeps a version segment', () => {
            expect(util['maskPath']('/v1')).toBe('/v1');
        });

        it('keeps a static kebab-case segment', () => {
            expect(util['maskPath']('/sign-up')).toBe('/sign-up');
        });

        it('redacts a purely numeric segment', () => {
            expect(util['maskPath']('/123')).toBe(`/${LoggerRedactedValue}`);
        });

        it('redacts a Mongo-id-shaped segment', () => {
            expect(util['maskPath']('/507f1f77bcf86cd799439011')).toBe(
                `/${LoggerRedactedValue}`
            );
        });
    });
});
