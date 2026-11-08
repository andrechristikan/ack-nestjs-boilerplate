import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';

describe('AnalyticAnomalyUtil', () => {
    let util: AnalyticAnomalyUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticAnomalyUtil],
        }).compile();

        util = module.get(AnalyticAnomalyUtil);
    });

    describe('groupByIp', () => {
        it('merges ip and user pairs into unique users and a summed count per ip and maps a missing ip to unknown', () => {
            const pairs = [
                { ipAddress: '10.0.0.1', userId: 'user-1', count: 1 },
                { ipAddress: '10.0.0.1', userId: 'user-2', count: 2 },
                { ipAddress: null, userId: 'user-3', count: 1 },
            ];

            const result = util.groupByIp(pairs);

            expect(result.get('10.0.0.1')).toEqual({
                users: new Set(['user-1', 'user-2']),
                count: 3,
            });
            expect(result.get('unknown')).toEqual({
                users: new Set(['user-3']),
                count: 1,
            });
            expect(result.size).toBe(2);
        });

        it('returns an empty map for no pairs', () => {
            expect(util.groupByIp([]).size).toBe(0);
        });
    });
});
