import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';

describe('AnalyticSortUtil', () => {
    let util: AnalyticSortUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AnalyticSortUtil],
        }).compile();

        util = module.get(AnalyticSortUtil);
    });

    describe('sortRows', () => {
        it('returns the very same array instance when orderBy is undefined', () => {
            const rows = [
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];

            const result = util.sortRows(rows, undefined, sortableKeys);

            expect(result).toBe(rows);
            expect(result).toEqual([
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ]);
        });

        it('returns the very same array instance when orderBy is empty', () => {
            const rows = [
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];

            const result = util.sortRows(rows, [], sortableKeys);

            expect(result).toBe(rows);
        });

        it('returns the very same array instance when no orderBy key is sortable', () => {
            const rows = [
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];
            const orderBy: IPaginationOrderBy[] = [
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).toBe(rows);
            expect(result).toEqual([
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ]);
        });

        it('sorts ascending on a sortable key into a new array and leaves the input untouched', () => {
            const rows = [
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];
            const orderBy: IPaginationOrderBy[] = [
                { userId: EnumPaginationOrderDirectionType.asc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).not.toBe(rows);
            expect(result).toEqual([
                { userId: 'user-1', score: 40 },
                { userId: 'user-2', score: 10 },
            ]);
            expect(rows).toEqual([
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ]);
        });

        it('sorts descending on a sortable key', () => {
            const rows = [
                { userId: 'user-1', score: 10 },
                { userId: 'user-2', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];
            const orderBy: IPaginationOrderBy[] = [
                { score: EnumPaginationOrderDirectionType.desc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).toEqual([
                { userId: 'user-2', score: 40 },
                { userId: 'user-1', score: 10 },
            ]);
        });

        it('drops the unsortable terms and applies only the sortable ones', () => {
            const rows = [
                { userId: 'user-2', score: 10 },
                { userId: 'user-1', score: 40 },
            ];
            const sortableKeys: ('userId' | 'score')[] = ['userId', 'score'];
            const orderBy: IPaginationOrderBy[] = [
                { createdAt: EnumPaginationOrderDirectionType.asc },
                { userId: EnumPaginationOrderDirectionType.asc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).toEqual([
                { userId: 'user-1', score: 40 },
                { userId: 'user-2', score: 10 },
            ]);
        });

        it('falls through to the next term when the first term compares equal', () => {
            const rows = [
                { userId: 'user-1', score: 10, band: 'review' },
                { userId: 'user-1', score: 40, band: 'monitor' },
            ];
            const sortableKeys: ('userId' | 'score' | 'band')[] = [
                'userId',
                'score',
                'band',
            ];
            const orderBy: IPaginationOrderBy[] = [
                { userId: EnumPaginationOrderDirectionType.asc },
                { score: EnumPaginationOrderDirectionType.desc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).toEqual([
                { userId: 'user-1', score: 40, band: 'monitor' },
                { userId: 'user-1', score: 10, band: 'review' },
            ]);
        });

        it('keeps the given order when every term compares equal', () => {
            const rows = [
                { userId: 'user-1', score: 10, band: 'review' },
                { userId: 'user-1', score: 10, band: 'monitor' },
            ];
            const sortableKeys: ('userId' | 'score' | 'band')[] = [
                'userId',
                'score',
                'band',
            ];
            const orderBy: IPaginationOrderBy[] = [
                { userId: EnumPaginationOrderDirectionType.asc },
                { score: EnumPaginationOrderDirectionType.asc },
            ];

            const result = util.sortRows(rows, orderBy, sortableKeys);

            expect(result).toEqual([
                { userId: 'user-1', score: 10, band: 'review' },
                { userId: 'user-1', score: 10, band: 'monitor' },
            ]);
        });
    });

    describe('compareValues', () => {
        it('compares two Dates by their epoch milliseconds', () => {
            const earlier = new Date(2026, 0, 1, 0, 0, 0);
            const later = new Date(2026, 0, 2, 0, 0, 0);

            expect(util['compareValues'](earlier, later)).toBe(
                earlier.getTime() - later.getTime()
            );
            expect(util['compareValues'](later, earlier)).toBe(
                later.getTime() - earlier.getTime()
            );
            expect(util['compareValues'](earlier, earlier)).toBe(0);
        });

        it('compares two numbers by subtraction', () => {
            expect(util['compareValues'](10, 4)).toBe(6);
            expect(util['compareValues'](4, 10)).toBe(-6);
            expect(util['compareValues'](4, 4)).toBe(0);
        });

        it('returns 0 when the stringified values match', () => {
            expect(util['compareValues']('monitor', 'monitor')).toBe(0);
            expect(util['compareValues'](null, null)).toBe(0);
        });

        it('returns -1 when the left string sorts first and 1 when it sorts last', () => {
            expect(util['compareValues']('elevate', 'monitor')).toBe(-1);
            expect(util['compareValues']('monitor', 'elevate')).toBe(1);
        });

        it('stringifies a mixed pair rather than comparing it numerically', () => {
            expect(util['compareValues'](10, '4')).toBe(-1);
            expect(util['compareValues'](new Date(2026, 0, 1), 4)).toBe(1);
            expect(util['compareValues'](undefined, null)).toBe(1);
        });
    });
});
