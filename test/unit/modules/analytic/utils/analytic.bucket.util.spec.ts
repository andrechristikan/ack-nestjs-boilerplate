import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { UserAgent } from '@generated/prisma-client/client';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { buildAnalyticSession } from '@test/unit/helpers/test.unit.analytic.helper';

describe('AnalyticBucketUtil', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const emptyAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const chrome: UserAgent = {
        ...emptyAgent,
        browser: { name: 'Chrome', version: null, major: null, type: null },
    };
    const ios: UserAgent = {
        ...emptyAgent,
        os: { name: 'iOS', version: null },
    };

    let util: AnalyticBucketUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticBucketUtil],
        }).compile();

        util = module.get(AnalyticBucketUtil);
    });

    describe('toBuckets', () => {
        it('maps each row to a bucket keyed by the named field as a string', () => {
            const rows = [
                { userId: 'user-1', count: 3 },
                { userId: 'user-2', count: 1 },
            ];

            expect(util.toBuckets(rows, 'userId')).toEqual([
                { key: 'user-1', count: 3 },
                { key: 'user-2', count: 1 },
            ]);
        });

        it('stringifies a non-string key', () => {
            expect(util.toBuckets([{ key: 7, count: 2 }], 'key')).toEqual([
                { key: '7', count: 2 },
            ]);
        });

        it('returns an empty list for no rows', () => {
            expect(util.toBuckets([], 'key')).toEqual([]);
        });
    });

    describe('toBucketsByBrowser', () => {
        it('counts sessions by browser, then os, then unknown, in first-seen order', () => {
            const sessions = [
                buildAnalyticSession('1', 'user-1', createdAt, null, chrome),
                buildAnalyticSession('2', 'user-2', createdAt, null, chrome),
                buildAnalyticSession('3', 'user-3', createdAt, null, ios),
                buildAnalyticSession(
                    '4',
                    'user-4',
                    createdAt,
                    null,
                    emptyAgent
                ),
            ];

            expect(util.toBucketsByBrowser(sessions)).toEqual([
                { key: 'Chrome', count: 2 },
                { key: 'iOS', count: 1 },
                { key: 'unknown', count: 1 },
            ]);
        });

        it('returns an empty list for no sessions', () => {
            expect(util.toBucketsByBrowser([])).toEqual([]);
        });
    });

    describe('toBucketsByCountRange', () => {
        it('counts each row into the range holding its count and keeps empty ranges', () => {
            const rows = [
                { userId: 'user-1', count: 1 },
                { userId: 'user-2', count: 1 },
                { userId: 'user-3', count: 2 },
                { userId: 'user-4', count: 3 },
                { userId: 'user-5', count: 5 },
                { userId: 'user-6', count: 6 },
                { userId: 'user-7', count: 40 },
            ];

            expect(util.toBucketsByCountRange(rows)).toEqual([
                { key: '1', count: 2 },
                { key: '2', count: 1 },
                { key: '3-5', count: 2 },
                { key: '6+', count: 2 },
            ]);
        });

        it('returns every range with a zero count for no rows', () => {
            expect(util.toBucketsByCountRange([])).toEqual([
                { key: '1', count: 0 },
                { key: '2', count: 0 },
                { key: '3-5', count: 0 },
                { key: '6+', count: 0 },
            ]);
        });

        it('ignores a row whose count is below every range', () => {
            expect(
                util.toBucketsByCountRange([{ userId: 'user-1', count: 0 }])
            ).toEqual([
                { key: '1', count: 0 },
                { key: '2', count: 0 },
                { key: '3-5', count: 0 },
                { key: '6+', count: 0 },
            ]);
        });
    });
});
