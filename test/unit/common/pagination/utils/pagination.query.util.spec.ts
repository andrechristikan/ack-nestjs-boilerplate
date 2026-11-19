import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import type {
    IPaginationOrderBy,
    IPaginationOrderByPresets,
    IPaginationQueryCursorOptions,
    IPaginationQueryOffsetOptions,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';

enum EnumTestOrderBy {
    latest = 'latest',
    name = 'name',
}

enum EnumTestMissingOrderBy {
    missing = 'missing',
}

describe('PaginationQueryUtil', () => {
    const paginationCursorUtil: MockProxy<PaginationCursorUtil> =
        mock<PaginationCursorUtil>();
    const paginationOffsetUtil: MockProxy<PaginationOffsetUtil> =
        mock<PaginationOffsetUtil>();
    const fingerprint = 'aaaaaaaaaaaaaaaa';
    const desc = EnumPaginationOrderDirectionType.desc;
    const asc = EnumPaginationOrderDirectionType.asc;
    const presets = {
        [EnumTestOrderBy.latest]: [{ createdAt: desc }],
        [EnumTestOrderBy.name]: [{ name: asc }],
    } as const satisfies IPaginationOrderByPresets<
        'createdAt' | 'name',
        EnumTestOrderBy
    >;
    const defaultOrderBy = EnumTestOrderBy.latest;

    let util: PaginationQueryUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationCursorUtil.checkFormat.mockReturnValue(null);
        paginationCursorUtil.fingerprint.mockReturnValue(fingerprint);
        paginationOffsetUtil.parsePage.mockReturnValue(1);
        paginationOffsetUtil.skip.mockReturnValue(0);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationQueryUtil,
                {
                    provide: PaginationCursorUtil,
                    useValue: paginationCursorUtil,
                },
                {
                    provide: PaginationOffsetUtil,
                    useValue: paginationOffsetUtil,
                },
            ],
        }).compile();

        util = module.get(PaginationQueryUtil);
    });

    describe('offset', () => {
        it('resolves a named preset to its terms and stores its name and the preset names', () => {
            const { params, storePatch } = util.offset(
                { orderBy: 'name' },
                { orderBy: presets, defaultOrderBy }
            );

            expect(params.orderBy).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
            ]);
            expect(storePatch.orderBy).toBe('name');
            expect(storePatch.availableOrderBy).toEqual(['latest', 'name']);
        });

        it.each([
            ['an absent', {}],
            ['an empty', { orderBy: '' }],
        ])('resolves %s order by to the default preset name', (_label, dto) => {
            const { params, storePatch } = util.offset(dto, {
                orderBy: presets,
                defaultOrderBy,
            });

            expect(params).toEqual({
                limit: PaginationDefaultPerPage,
                skip: 0,
                orderBy: [{ createdAt: desc }],
            });
            expect(storePatch).toEqual({
                page: 1,
                perPage: PaginationDefaultPerPage,
                orderBy: defaultOrderBy,
                availableSearch: [],
                availableOrderBy: ['latest', 'name'],
            });
        });

        it('builds a search where clause and carries search in the store patch when available', () => {
            const { params, storePatch } = util.offset(
                { search: ' widget ' },
                { availableSearch: ['name'], orderBy: presets, defaultOrderBy }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('ignores search when no field is searchable', () => {
            const { params, storePatch } = util.offset(
                { search: 'widget' },
                { orderBy: presets, defaultOrderBy }
            );

            expect(params.where).toBeUndefined();
            expect(storePatch.search).toBeUndefined();
        });

        it('validates and applies an explicit page and perPage', () => {
            paginationOffsetUtil.parsePage.mockReturnValue(2);
            paginationOffsetUtil.skip.mockReturnValue(10);

            const { params, storePatch } = util.offset(
                { page: 2, perPage: 10 },
                { orderBy: presets, defaultOrderBy }
            );

            expect(paginationOffsetUtil.parsePage).toHaveBeenCalledWith(2);
            expect(paginationOffsetUtil.skip).toHaveBeenCalledWith(2, 10);
            expect(params).toMatchObject({ limit: 10, skip: 10 });
            expect(storePatch).toMatchObject({ page: 2, perPage: 10 });
        });

        it('rethrows the typed exception a nested validator raised', () => {
            paginationOffsetUtil.parsePage.mockReturnValue(
                new PaginationPageCannotBeLessThanOneException(0)
            );

            let error: unknown;
            try {
                util.offset({ page: 0 }, { orderBy: presets, defaultOrderBy });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageCannotBeLessThanOne
                    ],
                messagePath: 'pagination.error.pageCannotBeLessThanOne',
                messageProperties: { minPage: 1, receivedPage: 0 },
            });
        });

        it('accepts only a key of the preset constant', () => {
            expectTypeOf<
                IPaginationQueryOffsetOptions<typeof presets>['defaultOrderBy']
            >().toEqualTypeOf<EnumTestOrderBy.latest | EnumTestOrderBy.name>();

            expectTypeOf<{
                orderBy: typeof presets;
                defaultOrderBy: EnumTestMissingOrderBy.missing;
            }>().not.toExtend<IPaginationQueryOffsetOptions<typeof presets>>();
            expectTypeOf<{
                orderBy: typeof presets;
                defaultOrderBy: EnumTestOrderBy.name;
            }>().toExtend<IPaginationQueryOffsetOptions<typeof presets>>();
            expectTypeOf(util.offset<typeof presets>)
                .parameter(1)
                .toEqualTypeOf<IPaginationQueryOffsetOptions<typeof presets>>();
        });

        it('requires a preset for every enum member', () => {
            expectTypeOf<{
                [EnumTestOrderBy.latest]: readonly [{ createdAt: typeof desc }];
            }>().not.toExtend<
                IPaginationOrderByPresets<'createdAt' | 'name', EnumTestOrderBy>
            >();
            expectTypeOf<typeof presets>().toExtend<
                IPaginationOrderByPresets<'createdAt' | 'name', EnumTestOrderBy>
            >();
        });
    });

    describe('cursor', () => {
        const options = {
            scope: 'RoleSystemListCursorScope',
            orderBy: presets,
            defaultOrderBy,
        } as const;

        it('resolves a named preset to its terms, stores its name and the preset names, and fingerprints the terms', () => {
            const dto = { orderBy: 'name' };

            const { params, storePatch } = util.cursor(dto, options);

            expect(params.orderBy).toEqual([{ name: asc }]);
            expect(storePatch.orderBy).toBe('name');
            expect(storePatch.availableOrderBy).toEqual(['latest', 'name']);
            expect(paginationCursorUtil.fingerprint).toHaveBeenCalledWith(
                options.scope,
                dto,
                [{ name: asc }]
            );
        });

        it.each([
            ['an absent', {}],
            ['an empty', { orderBy: '' }],
        ])('resolves %s order by to the default preset name', (_label, dto) => {
            const { params, storePatch } = util.cursor(dto, options);

            expect(params).toEqual({
                limit: PaginationDefaultPerPage,
                orderBy: [{ createdAt: desc }],
                fingerprint,
            });
            expect(storePatch).toEqual({
                perPage: PaginationDefaultPerPage,
                orderBy: defaultOrderBy,
                availableSearch: [],
                availableOrderBy: ['latest', 'name'],
            });
            expect(paginationCursorUtil.fingerprint).toHaveBeenCalledWith(
                options.scope,
                dto,
                [{ createdAt: desc }]
            );
        });

        it('passes a well-formed cursor through to the params and the store patch without opening it', () => {
            const { params, storePatch } = util.cursor(
                { cursor: 'Ab-_1' },
                options
            );

            expect(params.cursor).toBe('Ab-_1');
            expect(storePatch.cursor).toBe('Ab-_1');
        });

        it('builds a search where clause and carries search in the store patch when available', () => {
            const { params, storePatch } = util.cursor(
                { search: ' widget ' },
                { ...options, availableSearch: ['name'] }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('passes perPage and cursor to the fingerprint inside the dto', () => {
            const dto = { search: ' a ', perPage: 50, cursor: 'Ab-_1' };

            const { params } = util.cursor(dto, options);

            expect(paginationCursorUtil.fingerprint).toHaveBeenCalledWith(
                options.scope,
                dto,
                [{ createdAt: desc }]
            );
            expect(params.fingerprint).toBe(fingerprint);
        });

        it('rethrows the typed exception a nested validator raised', () => {
            let error: unknown;
            try {
                util.cursor({ perPage: 0 }, options);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.perPageCannotBeLessThanOne
                    ],
                messagePath: 'pagination.error.perPageCannotBeLessThanOne',
                messageProperties: { minPerPage: 1, receivedPerPage: 0 },
            });
        });

        it('rejects a cursor exceeding the maximum length', () => {
            paginationCursorUtil.checkFormat.mockReturnValue(
                new PaginationCursorTooLongException(PaginationMaxCursorLength)
            );

            let error: unknown;
            try {
                util.cursor(
                    { cursor: 'a'.repeat(PaginationMaxCursorLength + 1) },
                    options
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.cursorTooLong,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.cursorTooLong
                    ],
                messagePath: 'pagination.error.cursorTooLong',
                messageProperties: {
                    maxCursorLength: PaginationMaxCursorLength,
                },
            });
        });

        it('rejects a cursor that is not URL-safe', () => {
            paginationCursorUtil.checkFormat.mockReturnValue(
                new PaginationInvalidCursorFormatException()
            );

            let error: unknown;
            try {
                util.cursor({ cursor: 'a+b/c=' }, options);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
            });
        });

        it('accepts only a key of the preset constant', () => {
            expectTypeOf<
                IPaginationQueryCursorOptions<typeof presets>['defaultOrderBy']
            >().toEqualTypeOf<EnumTestOrderBy.latest | EnumTestOrderBy.name>();

            expectTypeOf<{
                scope: string;
                orderBy: typeof presets;
                defaultOrderBy: EnumTestMissingOrderBy.missing;
            }>().not.toExtend<IPaginationQueryCursorOptions<typeof presets>>();
        });
    });

    describe('resolveTiebreak', () => {
        it('falls back to the default order plus the tiebreaker when an empty list is sent', () => {
            expect(util.resolveTiebreak([], 'id')).toEqual([
                ...PaginationDefaultOrderBy,
                { id: EnumPaginationOrderDirectionType.desc },
            ]);
        });

        it('returns the order unchanged when it already carries the tiebreak field', () => {
            const orderBy: IPaginationOrderBy[] = [
                { id: EnumPaginationOrderDirectionType.asc },
            ];

            expect(util.resolveTiebreak(orderBy, 'id')).toBe(orderBy);
        });

        it('appends the tiebreak field using the last term direction', () => {
            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            expect(util.resolveTiebreak(orderBy, 'id')).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.asc },
            ]);
        });
    });

    describe('buildSearchObject', () => {
        it('builds a case-insensitive OR clause over every searchable field', () => {
            const result = util['buildSearchObject']('widget', [
                'name',
                'description',
            ]);

            expect(result).toEqual({
                OR: [
                    {
                        name: {
                            contains: 'widget',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        description: {
                            contains: 'widget',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            });
        });
    });

    describe('validateAndParsePage', () => {
        it('passes null when the page is omitted and returns the parsed page', () => {
            expect(util['validateAndParsePage'](undefined)).toBe(1);
            expect(paginationOffsetUtil.parsePage).toHaveBeenCalledWith(null);
        });

        it('returns the page the sibling parsed from a sent value', () => {
            paginationOffsetUtil.parsePage.mockReturnValue(3);

            expect(util['validateAndParsePage']('3')).toBe(3);
            expect(paginationOffsetUtil.parsePage).toHaveBeenCalledWith('3');
        });

        it('throws the invalid page exception the sibling returns', () => {
            const failure = new PaginationInvalidPageException(
                PaginationDefaultMaxPage
            );
            paginationOffsetUtil.parsePage.mockReturnValue(failure);

            let error: unknown;
            try {
                util['validateAndParsePage'](1.5);
            } catch (caught) {
                error = caught;
            }

            expect(error).toBe(failure);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                messagePath: 'pagination.error.invalidPage',
            });
        });

        it('throws the page above maximum exception the sibling returns', () => {
            const failure = new PaginationPageExceedsMaximumException(
                PaginationDefaultMaxPage,
                PaginationDefaultMaxPage + 1
            );
            paginationOffsetUtil.parsePage.mockReturnValue(failure);

            let error: unknown;
            try {
                util['validateAndParsePage'](PaginationDefaultMaxPage + 1);
            } catch (caught) {
                error = caught;
            }

            expect(error).toBe(failure);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
            });
        });
    });

    describe('validateAndParsePerPage', () => {
        it('defaults to the default perPage when omitted', () => {
            expect(util['validateAndParsePerPage'](undefined)).toBe(
                PaginationDefaultPerPage
            );
        });

        it('defaults to a named default perPage when omitted', () => {
            expect(util['validateAndParsePerPage'](undefined, 5)).toBe(5);
        });

        it('parses a numeric string', () => {
            expect(util['validateAndParsePerPage']('30')).toBe(30);
        });

        it('rejects a non-integer perPage', () => {
            let error: unknown;
            try {
                util['validateAndParsePerPage'](1.5);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPerPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPerPage
                    ],
                messagePath: 'pagination.error.invalidPerPage',
                messageProperties: {
                    maxPerPage: PaginationDefaultMaxPerPage,
                },
            });
        });

        it('rejects a non-numeric perPage string', () => {
            let error: unknown;
            try {
                util['validateAndParsePerPage']('abc');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPerPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPerPage
                    ],
                messagePath: 'pagination.error.invalidPerPage',
                messageProperties: {
                    maxPerPage: PaginationDefaultMaxPerPage,
                },
            });
        });

        it('rejects a perPage above the maximum', () => {
            let error: unknown;
            try {
                util['validateAndParsePerPage'](
                    PaginationDefaultMaxPerPage + 1
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.perPageExceedsMaximum,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.perPageExceedsMaximum
                    ],
                messagePath: 'pagination.error.perPageExceedsMaximum',
                messageProperties: {
                    maxPerPage: PaginationDefaultMaxPerPage,
                    receivedPerPage: PaginationDefaultMaxPerPage + 1,
                },
            });
        });

        it('rejects a perPage below one', () => {
            let error: unknown;
            try {
                util['validateAndParsePerPage'](0);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.perPageCannotBeLessThanOne
                    ],
                messagePath: 'pagination.error.perPageCannotBeLessThanOne',
                messageProperties: { minPerPage: 1, receivedPerPage: 0 },
            });
        });
    });

    describe('validateAndSanitizeCursor', () => {
        it('returns null for a non-string cursor', () => {
            expect(util['validateAndSanitizeCursor'](undefined)).toBeNull();
        });

        it('returns null for a blank cursor', () => {
            expect(util['validateAndSanitizeCursor']('   ')).toBeNull();
        });

        it('throws the too long exception the sibling returns', () => {
            const failure = new PaginationCursorTooLongException(
                PaginationMaxCursorLength
            );
            paginationCursorUtil.checkFormat.mockReturnValue(failure);

            let error: unknown;
            try {
                util['validateAndSanitizeCursor'](
                    'a'.repeat(PaginationMaxCursorLength + 1)
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toBe(failure);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.cursorTooLong,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.cursorTooLong
                    ],
                messagePath: 'pagination.error.cursorTooLong',
                messageProperties: {
                    maxCursorLength: PaginationMaxCursorLength,
                },
            });
        });

        it('throws the invalid format exception the sibling returns', () => {
            const failure = new PaginationInvalidCursorFormatException();
            paginationCursorUtil.checkFormat.mockReturnValue(failure);

            let error: unknown;
            try {
                util['validateAndSanitizeCursor']('not url safe!');
            } catch (caught) {
                error = caught;
            }

            expect(error).toBe(failure);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                messagePath: 'pagination.error.invalidCursorFormat',
                messageProperties: null,
            });
        });

        it('trims and returns a valid cursor', () => {
            expect(util['validateAndSanitizeCursor'](' Ab-_1 ')).toBe('Ab-_1');
            expect(paginationCursorUtil.checkFormat).toHaveBeenCalledWith(
                'Ab-_1'
            );
        });
    });
});
