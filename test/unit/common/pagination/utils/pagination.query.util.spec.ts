import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { ConfigService } from '@nestjs/config';
import {
    expectOpenCursorError,
    sealRawCursor,
} from '@test/unit/helpers/test.unit.pagination-cursor.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultOrderBy,
    PaginationCursorEncryptionContext,
    PaginationCursorEncryptionPurpose,
    PaginationDefaultPerPage,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationOrderDirectionType,
} from '@common/pagination/enums/pagination.enum';
import { EnumPaginationFilterEnumOperator } from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import type { IPaginationOrderByQuery } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';

describe('PaginationQueryUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperEncryptionService = new HelperEncryptionService();
    const secret = Buffer.alloc(48, 7).toString('base64url');
    const firstPageAt = new Date('2026-01-02T03:04:05.678Z');

    let util: PaginationQueryUtil;
    let configService: MockProxy<ConfigService>;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperArrayService.unique.mockImplementation((array: unknown[]) =>
            Array.from(new Set(array))
        );
        helperDateService.create.mockReturnValue(firstPageAt);
        helperDateService.checkIso.mockImplementation(
            iso => !Number.isNaN(Date.parse(iso))
        );
        helperDateService.createFromIso.mockImplementation(
            iso => new Date(iso)
        );
        configService = buildConfigService({
            'app.encryptionSecretKey': secret,
        });

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
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: ConfigService, useValue: configService },
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
            const { params, storePatch } = util.offset(
                { page: 2, perPage: 10 },
                { availableOrderBy: [] }
            );

            expect(params).toMatchObject({ limit: 10, skip: 10 });
            expect(storePatch).toMatchObject({ page: 2, perPage: 10 });
        });

        it('rethrows the typed exception a nested validator raised', () => {
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

        it('wraps a non-typed error raised while parsing into the typed pagination exception', () => {
            const orderBy = Object.create(
                null
            ) as unknown as IPaginationOrderByQuery;

            let error: unknown;
            try {
                util.offset({ orderBy }, { availableOrderBy: [] });
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
        it('defaults perPage, cursor field and order by when the dto is empty and the options carry only an empty order by allow-list', () => {
            const { params, storePatch } = util.cursor(
                {},
                { availableOrderBy: [] }
            );

            expect(params).toEqual({
                where: undefined,
                limit: PaginationDefaultPerPage,
                cursor: undefined,
                cursorField: 'id',
                orderBy: [...PaginationDefaultOrderBy],
                firstPageAt,
            });
            expect(storePatch).toEqual({
                perPage: PaginationDefaultPerPage,
                cursor: undefined,
                orderBy: [...PaginationDefaultOrderBy],
                availableSearch: [],
                availableOrderBy: [],
            });
        });

        it('parses a sent order by into the params and the store patch', () => {
            const { params, storePatch } = util.cursor(
                { orderBy: ['name:asc', 'createdAt:desc'] },
                { availableOrderBy: [] }
            );

            const expected = [
                { name: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ];
            expect(params.orderBy).toEqual(expected);
            expect(storePatch.orderBy).toEqual(expected);
        });

        it('stores the passed order by allow-list without validating a sent order by', () => {
            const { params, storePatch } = util.cursor(
                { orderBy: 'anything:asc' },
                { availableOrderBy: ['name', 'createdAt'] }
            );

            expect(storePatch.availableOrderBy).toEqual(['name', 'createdAt']);
            expect(params.orderBy).toEqual([
                { anything: EnumPaginationOrderDirectionType.asc },
            ]);
        });

        it('uses a named cursor field', () => {
            const { params } = util.cursor(
                {},
                { cursorField: 'slug', availableOrderBy: [] }
            );

            expect(params.cursorField).toBe('slug');
        });

        it('sanitizes a sent cursor and takes firstPageAt from its token, not the clock', () => {
            const tokenFirstPageAt = new Date('2025-05-06T07:08:09.010Z');
            const cursor = util.sealCursor({
                values: { id: 'a'.repeat(24) },
                fingerprint: 'aaaaaaaaaaaaaaaa',
                firstPageAt: tokenFirstPageAt,
            });

            const { params, storePatch } = util.cursor(
                { cursor },
                { availableOrderBy: [] }
            );

            expect(params.cursor).toBe(cursor);
            expect(storePatch.cursor).toBe(cursor);
            expect(params.firstPageAt).toEqual(tokenFirstPageAt);
            expect(helperDateService.create).not.toHaveBeenCalled();
        });

        it('takes firstPageAt from the clock when no cursor is sent', () => {
            const { params } = util.cursor({}, { availableOrderBy: [] });

            expect(params.firstPageAt).toBe(firstPageAt);
        });

        it('answers a pagination 422 for a well-formed cursor that is not a sealed token', () => {
            expect(() =>
                util.cursor({ cursor: 'Ab-_1' }, { availableOrderBy: [] })
            ).toThrowError(
                expect.objectContaining({
                    module: 'pagination',
                    httpStatus: 422,
                })
            );
        });

        it('builds a search where clause and carries search in the store patch when available', () => {
            const { params, storePatch } = util.cursor(
                { search: ' widget ' },
                { availableSearch: ['name'], availableOrderBy: [] }
            );

            expect(params.where).toEqual({
                OR: [{ name: { contains: 'widget', mode: 'insensitive' } }],
            });
            expect(storePatch.search).toBe('widget');
        });

        it('rethrows the typed exception a nested validator raised', () => {
            let error: unknown;
            try {
                util.cursor({ perPage: 0 }, { availableOrderBy: [] });
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
                util.cursor(
                    { cursor: 'a'.repeat(PaginationMaxCursorLength + 1) },
                    { availableOrderBy: [] }
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

        it('wraps a non-typed error raised while parsing into the typed pagination exception', () => {
            const orderBy = Object.create(
                null
            ) as unknown as IPaginationOrderByQuery;

            let error: unknown;
            try {
                util.cursor({ orderBy }, { availableOrderBy: [] });
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

    describe('sealCursor', () => {
        const payload = {
            values: {
                createdAt: { $date: '2026-01-02T03:04:05.000Z' },
                id: 'x',
            },
            fingerprint: 'aaaaaaaaaaaaaaaa',
            firstPageAt,
        };

        it('returns a token of URL-safe characters only', () => {
            const token = util.sealCursor(payload);

            expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('seals under the cursor purpose and context with the app secret', () => {
            const token = util.sealCursor(payload);

            const plain = helperEncryptionService.aes256Decrypt(
                Buffer.from(token, 'base64url').toString(),
                secret,
                PaginationCursorEncryptionPurpose,
                PaginationCursorEncryptionContext
            );
            expect(JSON.parse(plain)).toEqual({
                values: payload.values,
                fingerprint: payload.fingerprint,
                firstPageAt: { $date: '2026-01-02T03:04:05.678Z' },
            });
        });

        it('returns a different token on each call for one payload', () => {
            expect(util.sealCursor(payload)).not.toBe(util.sealCursor(payload));
        });
    });

    describe('openCursor', () => {
        const payload = {
            values: {
                createdAt: { $date: '2026-01-02T03:04:05.000Z' },
                id: 'x',
            },
            fingerprint: 'aaaaaaaaaaaaaaaa',
            firstPageAt,
        };

        it('returns the sealed payload with firstPageAt a Date at the same millisecond', () => {
            const opened = util.openCursor(util.sealCursor(payload));

            expect(opened).toEqual(payload);
            expect(opened.firstPageAt).toBeInstanceOf(Date);
            expect(opened.firstPageAt.getTime()).toBe(firstPageAt.getTime());
        });

        it('answers 422 for a token with one changed character', () => {
            const token = util.sealCursor(payload);
            const flipped = token[20] === 'A' ? 'B' : 'A';
            const tampered = `${token.slice(0, 20)}${flipped}${token.slice(21)}`;

            expect(() => util.openCursor(tampered)).toThrowError(
                expect.objectContaining({
                    module: 'pagination',
                    httpStatus: 422,
                })
            );
        });

        it('answers failedToDecodeCursor for a token sealed under another purpose', () => {
            expectOpenCursorError(
                util,
                sealRawCursor(
                    secret,
                    {
                        ...payload,
                        firstPageAt: { $date: '2026-01-02T03:04:05.678Z' },
                    },
                    'OtherPurpose'
                ),
                EnumPaginationStatusCodeError.failedToDecodeCursor
            );
        });

        it('answers failedToDecodeCursor for a plain base64 JSON token', () => {
            expectOpenCursorError(
                util,
                Buffer.from(JSON.stringify(payload)).toString('base64url'),
                EnumPaginationStatusCodeError.failedToDecodeCursor
            );
        });

        const valid = {
            values: { id: 'x' },
            fingerprint: 'aaaaaaaaaaaaaaaa',
            firstPageAt: { $date: '2026-01-02T03:04:05.678Z' },
        };

        it.each([
            ['null', null],
            ['a number', 5],
            ['no fingerprint', { ...valid, fingerprint: undefined }],
            ['an empty fingerprint', { ...valid, fingerprint: '' }],
            ['a non-string fingerprint', { ...valid, fingerprint: 5 }],
            ['no values', { ...valid, values: undefined }],
            ['null values', { ...valid, values: null }],
            ['array values', { ...valid, values: ['x'] }],
            ['no firstPageAt', { ...valid, firstPageAt: undefined }],
            [
                'a bare string firstPageAt',
                { ...valid, firstPageAt: '2026-01-02T03:04:05.678Z' },
            ],
            [
                'a non-ISO firstPageAt',
                { ...valid, firstPageAt: { $date: 'nope' } },
            ],
            [
                'an extra key in firstPageAt',
                {
                    ...valid,
                    firstPageAt: { $date: '2026-01-02T03:04:05.678Z', x: 1 },
                },
            ],
        ])(
            'answers invalidCursorData for a sealed payload with %s',
            (_label, json) => {
                expectOpenCursorError(
                    util,
                    sealRawCursor(secret, json),
                    EnumPaginationStatusCodeError.invalidCursorData
                );
            }
        );
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

        it('returns null for an empty value', () => {
            expect(util.equalBoolean('active', undefined)).toBeNull();
            expect(util.equalBoolean('active', '')).toBeNull();
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

        it('returns null for an empty or non-string value', () => {
            expect(util.equalString('name', '')).toBeNull();
            expect(util.equalString('name', undefined)).toBeNull();
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

        it('returns null for an empty value', () => {
            expect(util.equalNumber('count', '')).toBeNull();
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

        it('returns null for an empty or non-string value', () => {
            expect(util.notEqual('name', '')).toBeNull();
            expect(util.notEqual('name', undefined)).toBeNull();
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

        it('returns null for an empty value', () => {
            expect(util.inEnum('status', undefined, defaultEnum)).toBeNull();
        });

        it('returns null when the allow-list is empty', () => {
            expect(util.inEnum('status', 'active', [])).toBeNull();
        });

        it('returns null when every entry is empty after filtering', () => {
            expect(util.inEnum('status', ',,', defaultEnum)).toBeNull();
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

        it('returns null for an empty value', () => {
            expect(util.dateBetween('createdAt', undefined)).toBeNull();
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
                where: { createdAt: { equals: parsed } },
                storeFilter: { createdAt: parsed },
            });
            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                iso,
                {}
            );
        });

        it('forwards the day-of option to the date parser', () => {
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(parsed);

            util.dateBetween('createdAt', iso, {
                dayOf: EnumHelperDateDayOf.end,
            });

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(iso, {
                dayOf: EnumHelperDateDayOf.end,
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

            expect(result?.where).toEqual({ joinedAt: { equals: parsed } });
        });
    });

    describe('equal', () => {
        it('returns null when the value is not a string', () => {
            expect(util['equal']('name', 5)).toBeNull();
        });

        it('returns null when the value is blank', () => {
            expect(util['equal']('name', '   ')).toBeNull();
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
            expect(util['extractOrderByToArray'](null)).toEqual([]);
        });

        it('parses an array of field:direction entries', () => {
            expect(
                util['extractOrderByToArray'](['name:ASC', 'createdAt'])
            ).toEqual([{ name: 'asc' }, { createdAt: '' }]);
        });

        it('parses a single field:direction string', () => {
            expect(util['extractOrderByToArray']('name:DESC')).toEqual([
                { name: 'desc' },
            ]);
        });

        it('parses a single field string without a direction to an empty direction', () => {
            expect(util['extractOrderByToArray']('name')).toEqual([
                { name: '' },
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

        it('parses a repeated order by in the sent order', () => {
            expect(
                util['resolveOrderBy'](['name:asc', 'createdAt:desc'])
            ).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ]);
        });

        it('does not reject a field or direction outside an allow-list', () => {
            expect(util['resolveOrderBy']('anything:desc')).toEqual([
                { anything: EnumPaginationOrderDirectionType.desc },
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
        it('returns null for a non-string cursor', () => {
            expect(util['validateAndSanitizeCursor'](undefined)).toBeNull();
        });

        it('returns null for a blank cursor', () => {
            expect(util['validateAndSanitizeCursor']('   ')).toBeNull();
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

        it('returns null for an empty value', () => {
            expect(
                util['enumFilter'](
                    'status',
                    undefined,
                    defaultEnum,
                    EnumPaginationFilterEnumOperator.in
                )
            ).toBeNull();
        });

        it('returns null when the allow-list is empty', () => {
            expect(
                util['enumFilter'](
                    'status',
                    'active',
                    [],
                    EnumPaginationFilterEnumOperator.in
                )
            ).toBeNull();
        });

        it('returns null when every entry is empty after filtering', () => {
            expect(
                util['enumFilter'](
                    'status',
                    ',,',
                    defaultEnum,
                    EnumPaginationFilterEnumOperator.in
                )
            ).toBeNull();
        });

        it('builds an in filter from a deduplicated comma-separated list', () => {
            const result = util['enumFilter'](
                'status',
                'active,active,inactive',
                defaultEnum,
                EnumPaginationFilterEnumOperator.in
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
                EnumPaginationFilterEnumOperator.notIn
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
                EnumPaginationFilterEnumOperator.in,
                { customField: 'state' }
            );

            expect(result?.where).toEqual({ state: { in: ['active'] } });
        });

        it('rejects a value outside the allowed enum', () => {
            let error: unknown;
            try {
                util['enumFilter'](
                    'status',
                    'unknown',
                    defaultEnum,
                    EnumPaginationFilterEnumOperator.in
                );
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
