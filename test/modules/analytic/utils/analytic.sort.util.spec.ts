import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';

interface IRow {
    id: string;
    at: Date;
    n: number;
    s: string;
    hidden: number;
}

describe('AnalyticSortUtil', () => {
    let util: AnalyticSortUtil;
    const keys: (keyof IRow)[] = ['id', 'at', 'n', 's'];

    const row = (id: string, at: number, n: number, s: string): IRow => ({
        id,
        at: new Date(at),
        n,
        s,
        hidden: 0,
    });

    beforeEach(() => {
        util = new AnalyticSortUtil();
    });

    describe('sortRows', () => {
        it('returns the same array when orderBy is undefined', () => {
            const rows = [row('a', 2, 2, 'b'), row('b', 1, 1, 'a')];

            expect(util.sortRows(rows, undefined, keys)).toBe(rows);
        });

        it('returns the same array when orderBy is empty', () => {
            const rows = [row('a', 2, 2, 'b')];

            expect(util.sortRows(rows, [], keys)).toBe(rows);
        });

        it('ignores terms whose field is not sortable', () => {
            const rows = [row('a', 2, 2, 'b')];

            expect(
                util.sortRows(
                    rows,
                    [{ hidden: EnumPaginationOrderDirectionType.asc }],
                    keys
                )
            ).toBe(rows);
        });

        it('sorts dates ascending without mutating input', () => {
            const rows = [
                row('a', 3, 0, ''),
                row('b', 1, 0, ''),
                row('c', 2, 0, ''),
            ];

            const result = util.sortRows(
                rows,
                [{ at: EnumPaginationOrderDirectionType.asc }],
                keys
            );

            expect(result.map(r => r.id)).toEqual(['b', 'c', 'a']);
            expect(result).not.toBe(rows);
            expect(rows.map(r => r.id)).toEqual(['a', 'b', 'c']);
        });

        it('sorts numbers descending', () => {
            const rows = [
                row('a', 0, 1, ''),
                row('b', 0, 3, ''),
                row('c', 0, 2, ''),
            ];

            const result = util.sortRows(
                rows,
                [{ n: EnumPaginationOrderDirectionType.desc }],
                keys
            );

            expect(result.map(r => r.id)).toEqual(['b', 'c', 'a']);
        });

        it('sorts strings ascending and descending', () => {
            const rows = [
                row('1', 0, 0, 'b'),
                row('2', 0, 0, 'c'),
                row('3', 0, 0, 'a'),
            ];

            expect(
                util
                    .sortRows(
                        rows,
                        [{ s: EnumPaginationOrderDirectionType.asc }],
                        keys
                    )
                    .map(r => r.s)
            ).toEqual(['a', 'b', 'c']);
            expect(
                util
                    .sortRows(
                        rows,
                        [{ s: EnumPaginationOrderDirectionType.desc }],
                        keys
                    )
                    .map(r => r.s)
            ).toEqual(['c', 'b', 'a']);
        });

        it('falls back to string compare on mixed types', () => {
            const rows = [
                { v: 'b' as unknown },
                { v: 2 as unknown },
                { v: 'a' as unknown },
            ];

            const result = util.sortRows(
                rows,
                [{ v: EnumPaginationOrderDirectionType.asc }],
                ['v']
            );

            expect(result.map(r => r.v)).toEqual([2, 'a', 'b']);
        });

        it('uses the next term as tie-breaker when the first is equal', () => {
            const rows = [
                row('a', 0, 1, 'x'),
                row('b', 0, 1, 'y'),
                row('c', 0, 0, 'z'),
            ];

            const result = util.sortRows(
                rows,
                [
                    { n: EnumPaginationOrderDirectionType.asc },
                    { s: EnumPaginationOrderDirectionType.desc },
                ],
                keys
            );

            expect(result.map(r => r.id)).toEqual(['c', 'b', 'a']);
        });

        it('treats equal strings as a tie', () => {
            const rows = [row('a', 0, 0, 'x'), row('b', 0, 0, 'x')];

            const result = util.sortRows(
                rows,
                [{ s: EnumPaginationOrderDirectionType.asc }],
                keys
            );

            expect(result.map(r => r.id)).toEqual(['a', 'b']);
        });

        it('keeps order when every term compares equal', () => {
            const rows = [row('a', 1, 1, 'x'), row('b', 1, 1, 'x')];

            const result = util.sortRows(
                rows,
                [
                    { n: EnumPaginationOrderDirectionType.asc },
                    { at: EnumPaginationOrderDirectionType.desc },
                ],
                keys
            );

            expect(result.map(r => r.id)).toEqual(['a', 'b']);
        });
    });
});
