import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import {
    PaginationAllowedOrderDirections,
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
} from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { Prisma } from '@generated/prisma-client/client';

describe('PaginationQueryUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();

    let util: PaginationQueryUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperArrayService.unique.mockImplementation((array: unknown[]) =>
            Array.from(new Set(array))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationQueryUtil,
                {
                    provide: HelperDateService,
                    useValue: helperDateService,
                },
                {
                    provide: HelperArrayService,
                    useValue: helperArrayService,
                },
            ],
        }).compile();

        util = module.get(PaginationQueryUtil);
    });

    describe('offset', () => {
        it('defaults page, perPage and order by when the dto and options are empty', () => {
            const { params, storePatch } = util.offset({});

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
                { availableSearch: ['name'] }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('ignores search when no field is searchable', () => {
            const { params, storePatch } = util.offset({ search: 'widget' });

            expect(params.where).toBeUndefined();
            expect(storePatch.search).toBeUndefined();
        });

        it('validates and applies an explicit page and perPage', () => {
            const { params, storePatch } = util.offset({
                page: 2,
                perPage: 10,
            });

            expect(params).toMatchObject({ limit: 10, skip: 10 });
            expect(storePatch).toMatchObject({ page: 2, perPage: 10 });
        });

        it('rethrows the typed exception a nested validator raised', () => {
            let error: unknown;
            try {
                util.offset({ page: 0 });
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

        it('wraps a non-typed error raised while parsing into the typed pagination exception', () => {
            const orderBy = Object.create(null) as unknown as string;

            let error: unknown;
            try {
                util.offset({ orderBy });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError
                            .invalidOffsetPaginationParams
                    ],
                messagePath: 'pagination.error.invalidOffsetPaginationParams',
            });
        });
    });

    describe('cursor', () => {
        it('defaults perPage, cursor field and order by when the dto and options are empty', () => {
            const { params, storePatch } = util.cursor({});

            expect(params).toEqual({
                where: undefined,
                limit: PaginationDefaultPerPage,
                cursor: undefined,
                cursorField: 'id',
                orderBy: [...PaginationDefaultOrderBy],
            });
            expect(storePatch).toEqual({
                perPage: PaginationDefaultPerPage,
                cursor: undefined,
                orderBy: [...PaginationDefaultOrderBy],
                availableSearch: [],
                availableOrderBy: [],
            });
        });

        it('uses a named cursor field', () => {
            const { params } = util.cursor({}, { cursorField: 'slug' });

            expect(params.cursorField).toBe('slug');
        });

        it('sanitizes a sent cursor', () => {
            const { params, storePatch } = util.cursor({ cursor: 'Ab-_1' });

            expect(params.cursor).toBe('Ab-_1');
            expect(storePatch.cursor).toBe('Ab-_1');
        });

        it('builds a search where clause and carries search in the store patch when available', () => {
            const { params, storePatch } = util.cursor(
                { search: ' widget ' },
                { availableSearch: ['name'] }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('rethrows the typed exception a nested validator raised', () => {
            let error: unknown;
            try {
                util.cursor({ perPage: 0 });
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
            let error: unknown;
            try {
                util.cursor({ cursor: 'a'.repeat(300) });
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

        it('wraps a non-typed error raised while parsing into the typed pagination exception', () => {
            const orderBy = Object.create(null) as unknown as string;

            let error: unknown;
            try {
                util.cursor({ orderBy });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError
                            .invalidCursorPaginationParams
                    ],
                messagePath: 'pagination.error.invalidCursorPaginationParams',
            });
        });
    });

    describe('equalBoolean', () => {
        it('accepts a boolean value directly', () => {
            const result = util.equalBoolean('active', true);

            expect(result).toEqual({
                where: { active: { equals: true } },
                storeFilter: { active: true },
            });
        });

        it('accepts a false boolean value directly', () => {
            const result = util.equalBoolean('active', false);

            expect(result).toEqual({
                where: { active: { equals: false } },
                storeFilter: { active: false },
            });
        });

        it('honors a custom field on the boolean-typed path', () => {
            const result = util.equalBoolean('active', true, {
                customField: 'isActive',
            });

            expect(result?.where).toEqual({ isActive: { equals: true } });
        });

        it('coerces a boolean-shaped string', () => {
            const result = util.equalBoolean('active', 'true');

            expect(result).toEqual({
                where: { active: { equals: true } },
                storeFilter: { active: true },
            });
        });

        it('rejects a string that is not a boolean shape', () => {
            let error: unknown;
            try {
                util.equalBoolean('active', 'maybe');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValue',
                messageProperties: { property: 'active' },
            });
        });

        it('returns undefined for an empty value', () => {
            expect(util.equalBoolean('active', undefined)).toBeUndefined();
            expect(util.equalBoolean('active', '')).toBeUndefined();
        });
    });

    describe('equalString', () => {
        it('builds an equals filter from a trimmed string', () => {
            const result = util.equalString('name', ' widget ');

            expect(result).toEqual({
                where: { name: { equals: 'widget' } },
                storeFilter: { name: 'widget' },
            });
        });

        it('honors a custom field', () => {
            const result = util.equalString('name', 'widget', {
                customField: 'title',
            });

            expect(result?.where).toEqual({ title: { equals: 'widget' } });
        });

        it('returns undefined for an empty or non-string value', () => {
            expect(util.equalString('name', '')).toBeUndefined();
            expect(util.equalString('name', undefined)).toBeUndefined();
        });
    });

    describe('equalNumber', () => {
        it('parses a numeric string', () => {
            const result = util.equalNumber('count', '42');

            expect(result).toEqual({
                where: { count: { equals: 42 } },
                storeFilter: { count: 42 },
            });
        });

        it('rejects a non-numeric string', () => {
            let error: unknown;
            try {
                util.equalNumber('count', 'abc');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValue',
                messageProperties: { property: 'count' },
            });
        });

        it('returns undefined for an empty value', () => {
            expect(util.equalNumber('count', '')).toBeUndefined();
        });
    });

    describe('notEqual', () => {
        it('builds a not filter from a trimmed string', () => {
            const result = util.notEqual('name', ' widget ');

            expect(result).toEqual({
                where: { name: { not: 'widget' } },
                storeFilter: { name: 'widget' },
            });
        });

        it('honors a custom field', () => {
            const result = util.notEqual('name', 'widget', {
                customField: 'title',
            });

            expect(result?.where).toEqual({ title: { not: 'widget' } });
        });

        it('returns undefined for an empty or non-string value', () => {
            expect(util.notEqual('name', '')).toBeUndefined();
            expect(util.notEqual('name', undefined)).toBeUndefined();
        });
    });

    describe('inEnum', () => {
        const defaultEnum = ['active', 'inactive'];

        it('builds an in filter from a single value', () => {
            const result = util.inEnum('status', 'active', defaultEnum);

            expect(result).toEqual({
                where: { status: { in: ['active'] } },
                storeFilter: { status: ['active'] },
            });
        });

        it('builds an in filter from a deduplicated comma-separated list', () => {
            const result = util.inEnum(
                'status',
                'active,active,inactive',
                defaultEnum
            );

            expect(result?.where).toEqual({
                status: { in: ['active', 'inactive'] },
            });
        });

        it('honors a custom field', () => {
            const result = util.inEnum('status', 'active', defaultEnum, {
                customField: 'state',
            });

            expect(result?.where).toEqual({ state: { in: ['active'] } });
        });

        it('rejects a value outside the allowed enum', () => {
            let error: unknown;
            try {
                util.inEnum('status', 'unknown', defaultEnum);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValueEnum',
                messageProperties: {
                    property: 'status',
                    allowedValues: defaultEnum.join(', '),
                },
            });
        });

        it('returns undefined for an empty value', () => {
            expect(
                util.inEnum('status', undefined, defaultEnum)
            ).toBeUndefined();
        });

        it('returns undefined when the allow-list is empty', () => {
            expect(util.inEnum('status', 'active', [])).toBeUndefined();
        });

        it('returns undefined when every entry is empty after filtering', () => {
            expect(util.inEnum('status', ',,', defaultEnum)).toBeUndefined();
        });
    });

    describe('ninEnum', () => {
        it('builds a notIn filter', () => {
            const result = util.ninEnum('status', 'active', [
                'active',
                'inactive',
            ]);

            expect(result).toEqual({
                where: { status: { notIn: ['active'] } },
                storeFilter: { status: ['active'] },
            });
        });
    });

    describe('dateBetween', () => {
        const iso = '2026-01-01T00:00:00.000Z';
        const parsed = new Date(iso);

        it('returns undefined for an empty value', () => {
            expect(util.dateBetween('createdAt', undefined)).toBeUndefined();
        });

        it('rejects a non-iso value', () => {
            helperDateService.checkIso.mockReturnValue(false);

            let error: unknown;
            try {
                util.dateBetween('createdAt', 'not-a-date');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValue',
                messageProperties: { property: 'createdAt' },
            });
        });

        it('builds an equals filter when no bound type is sent', () => {
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(parsed);

            const result = util.dateBetween('createdAt', iso);

            expect(result).toEqual({
                where: { createdAt: { equal: parsed } },
                storeFilter: { createdAt: parsed },
            });
            expect(helperDateService.createFromIso).toHaveBeenCalledWith(iso, {
                dayOf: undefined,
            });
        });

        it('builds a gte filter for the start bound', () => {
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(parsed);

            const result = util.dateBetween('createdAt', iso, {
                type: EnumPaginationFilterDateBetweenType.start,
            });

            expect(result?.where).toEqual({ createdAt: { gte: parsed } });
        });

        it('builds a lte filter for the end bound', () => {
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(parsed);

            const result = util.dateBetween('createdAt', iso, {
                type: EnumPaginationFilterDateBetweenType.end,
            });

            expect(result?.where).toEqual({ createdAt: { lte: parsed } });
        });

        it('honors a custom field', () => {
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(parsed);

            const result = util.dateBetween('createdAt', iso, {
                customField: 'joinedAt',
            });

            expect(result?.where).toEqual({ joinedAt: { equal: parsed } });
        });
    });

    describe('equal', () => {
        it('returns undefined when the value is not a string', () => {
            expect(util['equal']('name', 5)).toBeUndefined();
        });

        it('returns undefined when the value is blank', () => {
            expect(util['equal']('name', '   ')).toBeUndefined();
        });

        it('builds a where clause and store filter keyed by the field name by default', () => {
            expect(util['equal']('name', 'jane')).toEqual({
                where: { name: { equals: 'jane' } },
                storeFilter: { name: 'jane' },
            });
        });

        it('builds a where clause keyed by the given customField, store filter keyed by the field', () => {
            expect(
                util['equal']('name', 'jane', { customField: 'fullName' })
            ).toEqual({
                where: { fullName: { equals: 'jane' } },
                storeFilter: { name: 'jane' },
            });
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

    describe('extractOrderByToArray', () => {
        it('returns an empty array when orderBy is not sent', () => {
            expect(util['extractOrderByToArray'](undefined)).toEqual([]);
        });

        it('parses an array of field:direction entries', () => {
            expect(
                util['extractOrderByToArray'](['name:ASC', 'createdAt'])
            ).toEqual([{ name: 'asc' }, { createdAt: undefined }]);
        });

        it('parses a single field:direction string', () => {
            expect(util['extractOrderByToArray']('name:DESC')).toEqual([
                { name: 'desc' },
            ]);
        });
    });

    describe('parseOrderBy', () => {
        it('maps every entry to its order direction enum member', () => {
            expect(
                util['parseOrderBy']([{ name: 'asc' }, { createdAt: 'desc' }])
            ).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ]);
        });
    });

    describe('validateOrderBy', () => {
        it('rejects a field the route does not allow', () => {
            let error: unknown;
            try {
                util['validateOrderBy']([{ unknown: 'asc' }], ['name']);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.orderByNotAllowed
                    ],
                messagePath: 'pagination.error.orderByNotAllowed',
                messageProperties: { allowedFields: 'name' },
            });
        });

        it('rejects a direction the route does not allow', () => {
            let error: unknown;
            try {
                util['validateOrderBy']([{ name: 'sideways' }], ['name']);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.orderDirectionNotAllowed,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.orderDirectionNotAllowed
                    ],
                messagePath: 'pagination.error.orderDirectionNotAllowed',
                messageProperties: {
                    allowedDirections:
                        PaginationAllowedOrderDirections.join(', '),
                },
            });
        });

        it('parses every entry when field and direction are allowed', () => {
            expect(
                util['validateOrderBy']([{ name: 'asc' }], ['name'])
            ).toEqual([{ name: EnumPaginationOrderDirectionType.asc }]);
        });
    });

    describe('resolveOrderBy', () => {
        it('falls back to the default order when orderBy is not sent', () => {
            expect(util['resolveOrderBy'](undefined, ['name'])).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('falls back to the default order when the allow-list is empty', () => {
            expect(util['resolveOrderBy']('name:asc', [])).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('validates and parses an explicit order by', () => {
            expect(util['resolveOrderBy']('name:asc', ['name'])).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
            ]);
        });
    });

    describe('validateAndParsePage', () => {
        it('defaults to page 1 when omitted', () => {
            expect(util['validateAndParsePage'](undefined)).toBe(1);
        });

        it('parses a numeric string', () => {
            expect(util['validateAndParsePage']('3')).toBe(3);
        });

        it('rejects a non-integer page', () => {
            let error: unknown;
            try {
                util['validateAndParsePage'](1.5);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                messagePath: 'pagination.error.invalidPage',
                messageProperties: { maxPage: PaginationDefaultMaxPage },
            });
        });

        it('rejects a non-numeric page string', () => {
            let error: unknown;
            try {
                util['validateAndParsePage']('abc');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                messagePath: 'pagination.error.invalidPage',
                messageProperties: { maxPage: PaginationDefaultMaxPage },
            });
        });

        it('rejects a page above the maximum', () => {
            let error: unknown;
            try {
                util['validateAndParsePage'](PaginationDefaultMaxPage + 1);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageExceedsMaximum
                    ],
                messagePath: 'pagination.error.pageExceedsMaximum',
                messageProperties: {
                    maxPage: PaginationDefaultMaxPage,
                    receivedPage: PaginationDefaultMaxPage + 1,
                },
            });
        });

        it('rejects a page below one', () => {
            let error: unknown;
            try {
                util['validateAndParsePage'](0);
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
        it('returns undefined for a non-string cursor', () => {
            expect(
                util['validateAndSanitizeCursor'](undefined)
            ).toBeUndefined();
        });

        it('returns undefined for a blank cursor', () => {
            expect(util['validateAndSanitizeCursor']('   ')).toBeUndefined();
        });

        it('rejects a cursor over the maximum length', () => {
            let error: unknown;
            try {
                util['validateAndSanitizeCursor'](
                    'a'.repeat(PaginationMaxCursorLength + 1)
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

        it('rejects a cursor outside the URL-safe alphabet', () => {
            let error: unknown;
            try {
                util['validateAndSanitizeCursor']('not url safe!');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                messagePath: 'pagination.error.invalidCursorFormat',
                messageProperties: {
                    format: 'URL-safe base64 (A-Za-z0-9_-)',
                },
            });
        });

        it('trims and returns a valid cursor', () => {
            expect(util['validateAndSanitizeCursor'](' Ab-_1 ')).toBe('Ab-_1');
        });
    });

    describe('coerceEqualValue', () => {
        it('coerces a boolean-shaped string when isBoolean is set', () => {
            expect(
                util['coerceEqualValue']('active', 'true', {
                    isBoolean: true,
                })
            ).toBe(true);
        });

        it('rejects a string that is not a boolean shape', () => {
            let error: unknown;
            try {
                util['coerceEqualValue']('active', 'maybe', {
                    isBoolean: true,
                });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValue',
                messageProperties: { property: 'active' },
            });
        });

        it('parses a numeric string when isNumber is set', () => {
            expect(
                util['coerceEqualValue']('count', '42', { isNumber: true })
            ).toBe(42);
        });

        it('rejects a non-numeric string when isNumber is set', () => {
            let error: unknown;
            try {
                util['coerceEqualValue']('count', 'abc', { isNumber: true });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValue',
                messageProperties: { property: 'count' },
            });
        });

        it('trims a plain string when no coercion option is set', () => {
            expect(util['coerceEqualValue']('name', ' widget ')).toBe('widget');
        });
    });

    describe('enumFilter', () => {
        const defaultEnum = ['active', 'inactive'];

        it('returns undefined for an empty value', () => {
            expect(
                util['enumFilter']('status', undefined, defaultEnum, 'in')
            ).toBeUndefined();
        });

        it('returns undefined when the allow-list is empty', () => {
            expect(
                util['enumFilter']('status', 'active', [], 'in')
            ).toBeUndefined();
        });

        it('returns undefined when every entry is empty after filtering', () => {
            expect(
                util['enumFilter']('status', ',,', defaultEnum, 'in')
            ).toBeUndefined();
        });

        it('builds an in filter from a deduplicated comma-separated list', () => {
            const result = util['enumFilter'](
                'status',
                'active,active,inactive',
                defaultEnum,
                'in'
            );

            expect(result).toEqual({
                where: { status: { in: ['active', 'inactive'] } },
                storeFilter: { status: ['active', 'inactive'] },
            });
        });

        it('builds a notIn filter for the notIn operator', () => {
            const result = util['enumFilter'](
                'status',
                'active',
                defaultEnum,
                'notIn'
            );

            expect(result).toEqual({
                where: { status: { notIn: ['active'] } },
                storeFilter: { status: ['active'] },
            });
        });

        it('honors a custom field', () => {
            const result = util['enumFilter'](
                'status',
                'active',
                defaultEnum,
                'in',
                { customField: 'state' }
            );

            expect(result?.where).toEqual({ state: { in: ['active'] } });
        });

        it('rejects a value outside the allowed enum', () => {
            let error: unknown;
            try {
                util['enumFilter']('status', 'unknown', defaultEnum, 'in');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                messagePath: 'pagination.error.filterInvalidValueEnum',
                messageProperties: {
                    property: 'status',
                    allowedValues: defaultEnum.join(', '),
                },
            });
        });
    });
});
