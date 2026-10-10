import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';
import { PaginationFilterInvalidValueException } from '@common/pagination/exceptions/pagination.filter-invalid-value.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidOffsetPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-offset-pagination-params.exception';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';

describe('PaginationQueryUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    let util: PaginationQueryUtil;

    beforeEach(async () => {
        helperArrayService.unique.mockImplementation(values => [...values]);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationQueryUtil,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperArrayService, useValue: helperArrayService },
            ],
        }).compile();

        util = moduleRef.get(PaginationQueryUtil);
    });

    describe('offset', () => {
        it('returns parsed offset params, search, ordering, and store metadata', () => {
            const result = util.offset(
                {
                    page: 2,
                    perPage: 10,
                    search: '  Ada  ',
                    orderBy: ['name:ASC', 'createdAt:desc'],
                },
                {
                    availableSearch: ['name', 'email'],
                    availableOrderBy: ['name', 'createdAt'],
                }
            );

            expect(result).toEqual({
                params: {
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: 'Ada',
                                    mode: 'insensitive',
                                },
                            },
                            {
                                email: {
                                    contains: 'Ada',
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                    limit: 10,
                    skip: 10,
                    orderBy: [
                        { name: EnumPaginationOrderDirectionType.asc },
                        {
                            createdAt: EnumPaginationOrderDirectionType.desc,
                        },
                    ],
                },
                storePatch: {
                    page: 2,
                    perPage: 10,
                    search: 'Ada',
                    orderBy: [
                        { name: EnumPaginationOrderDirectionType.asc },
                        {
                            createdAt: EnumPaginationOrderDirectionType.desc,
                        },
                    ],
                    availableSearch: ['name', 'email'],
                    availableOrderBy: ['name', 'createdAt'],
                },
            });
        });

        it('uses defaults when optional query values and allow-lists are absent', () => {
            expect(util.offset({})).toMatchObject({
                params: {
                    where: undefined,
                    limit: 20,
                    skip: 0,
                    orderBy: PaginationDefaultOrderBy,
                },
                storePatch: {
                    page: 1,
                    perPage: 20,
                    availableSearch: [],
                    availableOrderBy: [],
                },
            });
        });

        it('preserves pagination exceptions', () => {
            expect(() => util.offset({ page: 0 })).toThrow(
                PaginationPageCannotBeLessThanOneException
            );
        });

        it('maps unexpected parse errors to offset params exception', () => {
            const dto = {
                get page(): number {
                    throw new Error('unexpected');
                },
            };

            expect(() => util.offset(dto)).toThrow(
                PaginationInvalidOffsetPaginationParamsException
            );
        });
    });

    describe('cursor', () => {
        it('returns parsed cursor params and custom cursor field', () => {
            const result = util.cursor(
                {
                    cursor: '  abc_123-XYZ  ',
                    perPage: 5,
                    search: ' user ',
                    orderBy: 'name:asc',
                },
                {
                    cursorField: 'userId',
                    availableSearch: ['name'],
                    availableOrderBy: ['name'],
                }
            );

            expect(result).toMatchObject({
                params: {
                    limit: 5,
                    cursor: 'abc_123-XYZ',
                    cursorField: 'userId',
                    orderBy: [{ name: EnumPaginationOrderDirectionType.asc }],
                },
                storePatch: {
                    perPage: 5,
                    cursor: 'abc_123-XYZ',
                    search: 'user',
                },
            });
        });

        it('uses cursor defaults and omits search without an allow-list', () => {
            expect(util.cursor({ search: 'ignored' })).toMatchObject({
                params: {
                    cursor: undefined,
                    cursorField: 'id',
                    where: undefined,
                    orderBy: PaginationDefaultOrderBy,
                },
            });
        });

        it('preserves cursor exceptions', () => {
            expect(() => util.cursor({ cursor: '+' })).toThrow(
                PaginationInvalidCursorFormatException
            );
        });

        it('maps unexpected parse errors to cursor params exception', () => {
            const dto = {
                get perPage(): number {
                    throw new Error('unexpected');
                },
            };

            expect(() => util.cursor(dto)).toThrow(
                PaginationInvalidCursorPaginationParamsException
            );
        });
    });

    describe('equalBoolean', () => {
        it('maps boolean and string values and supports a custom field', () => {
            expect(util.equalBoolean('active', true)).toEqual({
                where: { active: { equals: true } },
                storeFilter: { active: true },
            });
            expect(
                util.equalBoolean('active', ' false ', {
                    customField: 'enabled',
                })
            ).toEqual({
                where: { enabled: { equals: false } },
                storeFilter: { active: false },
            });
        });

        it('rejects an invalid boolean string', () => {
            expect(() => util.equalBoolean('active', 'yes')).toThrow(
                PaginationFilterInvalidValueException
            );
        });
    });

    describe('equalString', () => {
        it('trims a string and omits empty or non-string values', () => {
            expect(util.equalString('name', ' Ada ')).toEqual({
                where: { name: { equals: 'Ada' } },
                storeFilter: { name: 'Ada' },
            });
            expect(util.equalString('name', '   ')).toBeUndefined();
            expect(util.equalString('name', 1)).toBeUndefined();
        });
    });

    describe('equalNumber', () => {
        it('parses a number and rejects a non-number', () => {
            expect(util.equalNumber('score', ' 12.5 ')).toEqual({
                where: { score: { equals: 12.5 } },
                storeFilter: { score: 12.5 },
            });
            expect(() => util.equalNumber('score', 'invalid')).toThrow(
                PaginationFilterInvalidValueException
            );
        });
    });

    describe('notEqual', () => {
        it('maps a value and omits empty or non-string values', () => {
            expect(util.notEqual('status', ' disabled ')).toEqual({
                where: { status: { not: 'disabled' } },
                storeFilter: { status: 'disabled' },
            });
            expect(util.notEqual('status', '')).toBeUndefined();
            expect(util.notEqual('status', false)).toBeUndefined();
        });
    });

    describe('inEnum', () => {
        it('maps unique valid entries and supports a custom field', () => {
            helperArrayService.unique.mockReturnValue(['active', 'pending']);

            expect(
                util.inEnum(
                    'status',
                    'active, pending, active',
                    ['active', 'pending'],
                    { customField: 'state' }
                )
            ).toEqual({
                where: { state: { in: ['active', 'pending'] } },
                storeFilter: { status: ['active', 'pending'] },
            });
        });

        it('omits unusable values and rejects unknown enum members', () => {
            expect(util.inEnum('status', '', ['active'])).toBeUndefined();
            expect(util.inEnum('status', 1, ['active'])).toBeUndefined();
            expect(util.inEnum('status', 'active', [])).toBeUndefined();
            helperArrayService.unique.mockReturnValueOnce([]);
            expect(util.inEnum('status', ',', ['active'])).toBeUndefined();
            helperArrayService.unique.mockReturnValueOnce(['unknown']);
            expect(() => util.inEnum('status', 'unknown', ['active'])).toThrow(
                PaginationFilterInvalidValueEnumException
            );
        });
    });

    describe('ninEnum', () => {
        it('maps valid entries to notIn', () => {
            helperArrayService.unique.mockReturnValue(['disabled']);

            expect(util.ninEnum('status', 'disabled', ['disabled'])).toEqual({
                where: { status: { notIn: ['disabled'] } },
                storeFilter: { status: ['disabled'] },
            });
        });
    });

    describe('dateBetween', () => {
        it('maps equal, start, and end dates', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(date);

            expect(util.dateBetween('createdAt', '2026-01-01')).toEqual({
                where: { createdAt: { equal: date } },
                storeFilter: { createdAt: date },
            });
            expect(
                util.dateBetween('createdAt', '2026-01-01', {
                    type: EnumPaginationFilterDateBetweenType.start,
                    customField: 'date',
                })
            ).toEqual({
                where: { date: { gte: date } },
                storeFilter: { createdAt: date },
            });
            expect(
                util.dateBetween('createdAt', '2026-01-01', {
                    type: EnumPaginationFilterDateBetweenType.end,
                })
            ).toEqual({
                where: { createdAt: { lte: date } },
                storeFilter: { createdAt: date },
            });
        });

        it('omits empty inputs and rejects invalid ISO values', () => {
            expect(util.dateBetween('createdAt', '')).toBeUndefined();
            expect(util.dateBetween('createdAt', 1)).toBeUndefined();
            helperDateService.checkIso.mockReturnValue(false);
            expect(() => util.dateBetween('createdAt', 'invalid')).toThrow(
                PaginationFilterInvalidValueException
            );
        });
    });

    describe('validateAndParsePage', () => {
        it('parses strings and rejects invalid, excessive, and low pages', () => {
            expect(util['validateAndParsePage']('2')).toBe(2);
            expect(() => util['validateAndParsePage']('x')).toThrow(
                PaginationInvalidPageException
            );
            expect(() => util['validateAndParsePage'](1.5)).toThrow(
                PaginationInvalidPageException
            );
            expect(() =>
                util['validateAndParsePage'](PaginationDefaultMaxPage + 1)
            ).toThrow(PaginationPageExceedsMaximumException);
            expect(() => util['validateAndParsePage'](0)).toThrow(
                PaginationPageCannotBeLessThanOneException
            );
        });
    });

    describe('validateAndParsePerPage', () => {
        it('uses a custom default and rejects invalid, excessive, and low values', () => {
            expect(util['validateAndParsePerPage'](undefined, 7)).toBe(7);
            expect(util['validateAndParsePerPage']('2')).toBe(2);
            expect(() => util['validateAndParsePerPage']('x')).toThrow(
                PaginationInvalidPerPageException
            );
            expect(() => util['validateAndParsePerPage'](1.5)).toThrow(
                PaginationInvalidPerPageException
            );
            expect(() =>
                util['validateAndParsePerPage'](PaginationDefaultMaxPerPage + 1)
            ).toThrow(PaginationPerPageExceedsMaximumException);
            expect(() => util['validateAndParsePerPage'](0)).toThrow(
                PaginationPerPageCannotBeLessThanOneException
            );
        });
    });

    describe('validateAndSanitizeCursor', () => {
        it('omits absent cursors and validates length and format', () => {
            expect(util['validateAndSanitizeCursor']()).toBeUndefined();
            expect(util['validateAndSanitizeCursor'](' ')).toBeUndefined();
            expect(() =>
                util['validateAndSanitizeCursor'](
                    'a'.repeat(PaginationMaxCursorLength + 1)
                )
            ).toThrow(PaginationCursorTooLongException);
            expect(() => util['validateAndSanitizeCursor']('a+b')).toThrow(
                PaginationInvalidCursorFormatException
            );
        });
    });

    describe('resolveOrderBy', () => {
        it('rejects unavailable fields and invalid directions', () => {
            expect(() => util['resolveOrderBy']('email:asc', ['name'])).toThrow(
                PaginationOrderByNotAllowedException
            );
            expect(() =>
                util['resolveOrderBy']('name:sideways', ['name'])
            ).toThrow(PaginationOrderDirectionNotAllowedException);
        });
    });
});
