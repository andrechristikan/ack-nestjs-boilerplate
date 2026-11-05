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
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';

describe('PaginationQueryUtil', () => {
    const paginationCursorUtil: MockProxy<PaginationCursorUtil> =
        mock<PaginationCursorUtil>();
    const paginationOffsetUtil: MockProxy<PaginationOffsetUtil> =
        mock<PaginationOffsetUtil>();
    const fingerprint = 'aaaaaaaaaaaaaaaa';

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
        it('defaults page, perPage and order by when the dto is empty and the options carry only an empty order by allow-list', () => {
            const { params, storePatch } = util.offset(
                {},
                { availableOrderBy: [] }
            );

            expect(params).toEqual({
                where: undefined,
                limit: PaginationDefaultPerPage,
                skip: 0,
                orderBy: [...PaginationDefaultOrderBy],
            });
            expect(storePatch).toEqual({
                page: 1,
                perPage: PaginationDefaultPerPage,
                orderBy: [...PaginationDefaultOrderBy],
                availableSearch: [],
                availableOrderBy: [],
            });
        });

        it('builds a search where clause and carries search in the store patch when available', () => {
            const { params, storePatch } = util.offset(
                { search: ' widget ' },
                { availableSearch: ['name'], availableOrderBy: [] }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('stores the passed order by allow-list without validating a sent order by', () => {
            const { params, storePatch } = util.offset(
                { orderBy: 'anything:asc' },
                { availableOrderBy: ['name', 'createdAt'] }
            );

            expect(storePatch.availableOrderBy).toEqual(['name', 'createdAt']);
            expect(params.orderBy).toEqual([
                { anything: EnumPaginationOrderDirectionType.asc },
            ]);
        });

        it('ignores search when no field is searchable', () => {
            const { params, storePatch } = util.offset(
                { search: 'widget' },
                { availableOrderBy: [] }
            );

            expect(params.where).toBeUndefined();
            expect(storePatch.search).toBeUndefined();
        });

        it('parses a sent order by into the params and the store patch', () => {
            const { params, storePatch } = util.offset(
                { orderBy: 'name:asc' },
                { availableOrderBy: [] }
            );

            expect(params.orderBy).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
            ]);
            expect(storePatch.orderBy).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
            ]);
        });

        it('validates and applies an explicit page and perPage', () => {
            paginationOffsetUtil.parsePage.mockReturnValue(2);
            paginationOffsetUtil.skip.mockReturnValue(10);

            const { params, storePatch } = util.offset(
                { page: 2, perPage: 10 },
                { availableOrderBy: [] }
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
                util.offset({ page: 0 }, { availableOrderBy: [] });
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
    });

    describe('cursor', () => {
        const options = {
            scope: 'RoleSystemListCursorScope',
            availableOrderBy: [],
        };

        it('defaults perPage and order by when the dto is empty and the options carry only an empty order by allow-list', () => {
            const { params, storePatch } = util.cursor({}, options);

            expect(params).toEqual({
                limit: PaginationDefaultPerPage,
                orderBy: [...PaginationDefaultOrderBy],
                fingerprint,
            });
            expect(storePatch).toEqual({
                perPage: PaginationDefaultPerPage,
                orderBy: [...PaginationDefaultOrderBy],
                availableSearch: [],
                availableOrderBy: [],
            });
        });

        it('parses a sent order by into the params and the store patch', () => {
            const { params, storePatch } = util.cursor(
                { orderBy: 'name:asc' },
                options
            );

            const expected = [{ name: EnumPaginationOrderDirectionType.asc }];
            expect(params.orderBy).toEqual(expected);
            expect(storePatch.orderBy).toEqual(expected);
        });

        it('stores the passed order by allow-list without validating a sent order by', () => {
            const { params, storePatch } = util.cursor(
                { orderBy: 'anything:asc' },
                { ...options, availableOrderBy: ['name', 'createdAt'] }
            );

            expect(storePatch.availableOrderBy).toEqual(['name', 'createdAt']);
            expect(params.orderBy).toEqual([
                { anything: EnumPaginationOrderDirectionType.asc },
            ]);
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

        it.each([
            ['an absent', {}],
            ['an empty', { orderBy: '' }],
            ['an explicit default', { orderBy: 'createdAt:desc' }],
        ])(
            'passes the same resolved order by to the fingerprint for %s order by',
            (_label, dto) => {
                util.cursor(dto, options);

                expect(paginationCursorUtil.fingerprint).toHaveBeenCalledWith(
                    options.scope,
                    dto,
                    [{ createdAt: EnumPaginationOrderDirectionType.desc }]
                );
            }
        );

        it('passes perPage and cursor to the fingerprint inside the dto', () => {
            const dto = { search: ' a ', perPage: 50, cursor: 'Ab-_1' };

            const { params } = util.cursor(dto, options);

            expect(paginationCursorUtil.fingerprint).toHaveBeenCalledWith(
                options.scope,
                dto,
                [...PaginationDefaultOrderBy]
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

    describe('resolveOrderBy', () => {
        it('falls back to the default order when orderBy is not sent', () => {
            expect(util['resolveOrderBy'](null)).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('falls back to the default order when orderBy is an empty string', () => {
            expect(util['resolveOrderBy']('')).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('parses an explicit order by', () => {
            expect(util['resolveOrderBy']('name:asc')).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
            ]);
        });

        it('does not reject a field or direction outside an allow-list', () => {
            expect(util['resolveOrderBy']('anything:desc')).toEqual([
                { anything: EnumPaginationOrderDirectionType.desc },
            ]);
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
