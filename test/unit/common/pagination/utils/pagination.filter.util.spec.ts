import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import {
    EnumPaginationFilterDateBetweenType,
    EnumPaginationFilterEnumOperator,
} from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

describe('PaginationFilterUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();

    let util: PaginationFilterUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperArrayService.unique.mockImplementation((array: unknown[]) =>
            Array.from(new Set(array))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationFilterUtil,
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

        util = module.get(PaginationFilterUtil);
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
