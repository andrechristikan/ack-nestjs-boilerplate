import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    PaginationDefaultOrderBy,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';
import { EnumPaginationFilterDateBetweenType } from '@common/pagination/enums/pagination.enum';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client/client';

describe('PaginationQueryUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    let util: PaginationQueryUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperArrayService.unique.mockImplementation(array => [
            ...new Set(array),
        ]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationQueryUtil,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperArrayService, useValue: helperArrayService },
            ],
        }).compile();

        util = module.get(PaginationQueryUtil);
    });

    it('does not inject RequestStoreService', () => {
        const paramTypes: unknown[] =
            Reflect.getMetadata('design:paramtypes', PaginationQueryUtil) ?? [];

        expect(paramTypes).not.toContain(RequestStoreService);
    });

    describe('offset', () => {
        it('builds skip limit and default order', () => {
            const { params, storePatch } = util.offset(
                { page: 2, perPage: 10 },
                {}
            );

            expect(params).toEqual({
                skip: 10,
                limit: 10,
                orderBy: [...PaginationDefaultOrderBy],
                where: undefined,
            });
            expect(storePatch.page).toBe(2);
            expect(storePatch.perPage).toBe(10);
            expect(storePatch.orderBy).toEqual([...PaginationDefaultOrderBy]);
            expect(storePatch.availableSearch).toEqual([]);
            expect(storePatch.availableOrderBy).toEqual([]);
        });

        it('uses default perPage when omitted', () => {
            const { params, storePatch } = util.offset({ page: 1 }, {});

            expect(params.limit).toBe(PaginationDefaultPerPage);
            expect(storePatch.perPage).toBe(PaginationDefaultPerPage);
        });

        it('drops search when allow-list is empty', () => {
            const { params, storePatch } = util.offset(
                { search: 'alice', page: 1 },
                { availableSearch: [] }
            );

            expect(params.where).toBeUndefined();
            expect(storePatch.search).toBeUndefined();
        });

        it('builds OR search when allow-list and search string are present', () => {
            const { params, storePatch } = util.offset(
                { search: ' alice ', page: 1 },
                { availableSearch: ['name', 'email'] }
            );

            expect(params.where).toEqual({
                OR: [
                    {
                        name: {
                            contains: 'alice',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        email: {
                            contains: 'alice',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            });
            expect(storePatch.search).toBe('alice');
            expect(storePatch.availableSearch).toEqual(['name', 'email']);
        });

        it('rejects disallowed orderBy field', () => {
            expect(() =>
                util.offset(
                    { orderBy: 'email:asc', page: 1 },
                    { availableOrderBy: ['createdAt'] }
                )
            ).toThrow(PaginationOrderByNotAllowedException);
        });

        it('rejects disallowed orderBy direction', () => {
            expect(() =>
                util.offset(
                    { orderBy: 'createdAt:sideways', page: 1 },
                    { availableOrderBy: ['createdAt'] }
                )
            ).toThrow(PaginationOrderDirectionNotAllowedException);
        });

        it('parses allowed orderBy into storePatch and params', () => {
            const { params, storePatch } = util.offset(
                { orderBy: ['name:asc', 'createdAt:desc'], page: 1 },
                { availableOrderBy: ['name', 'createdAt'] }
            );

            expect(params.orderBy).toEqual([
                { name: 'asc' },
                { createdAt: 'desc' },
            ]);
            expect(storePatch.orderBy).toEqual(params.orderBy);
            expect(storePatch.availableOrderBy).toEqual(['name', 'createdAt']);
        });
    });

    describe('cursor', () => {
        it('builds limit cursorField and default order', () => {
            const { params, storePatch } = util.cursor({ perPage: 5 }, {});

            expect(params).toEqual({
                limit: 5,
                cursor: undefined,
                cursorField: 'id',
                orderBy: [...PaginationDefaultOrderBy],
                where: undefined,
            });
            expect(storePatch.perPage).toBe(5);
            expect(storePatch.cursor).toBeUndefined();
        });

        it('sanitizes cursor and builds search like offset', () => {
            const { params, storePatch } = util.cursor(
                {
                    cursor: ' abc123_- ',
                    search: 'bob',
                    perPage: 20,
                },
                { availableSearch: ['name'] }
            );

            expect(params.cursor).toBe('abc123_-');
            expect(params.where).toEqual({
                OR: [
                    {
                        name: {
                            contains: 'bob',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            });
            expect(storePatch.cursor).toBe('abc123_-');
            expect(storePatch.search).toBe('bob');
        });
    });

    describe('filter helpers', () => {
        it('equalBoolean returns where and storeFilter for true/false', () => {
            expect(util.equalBoolean('active', 'true')).toEqual({
                where: { active: { equals: true } },
                storeFilter: { active: true },
            });
            expect(util.equalBoolean('active', 'false')).toEqual({
                where: { active: { equals: false } },
                storeFilter: { active: false },
            });
        });

        it('equalBoolean accepts parsed boolean from RequestBooleanStringSchema', () => {
            expect(util.equalBoolean('active', true)).toEqual({
                where: { active: { equals: true } },
                storeFilter: { active: true },
            });
            expect(util.equalBoolean('active', false)).toEqual({
                where: { active: { equals: false } },
                storeFilter: { active: false },
            });
        });

        it('equalBoolean returns undefined for blank', () => {
            expect(util.equalBoolean('active', undefined)).toBeUndefined();
            expect(util.equalBoolean('active', '  ')).toBeUndefined();
        });

        it('equalString and equalNumber and notEqual mirror pipes', () => {
            expect(util.equalString('roleId', ' abc ')).toEqual({
                where: { roleId: { equals: 'abc' } },
                storeFilter: { roleId: 'abc' },
            });
            expect(util.equalNumber('score', '3.5')).toEqual({
                where: { score: { equals: 3.5 } },
                storeFilter: { score: 3.5 },
            });
            expect(util.notEqual('roleId', 'x')).toEqual({
                where: { roleId: { not: 'x' } },
                storeFilter: { roleId: 'x' },
            });
        });

        it('inEnum and ninEnum unique-split and validate', () => {
            const allowed = ['active', 'inactive'] as const;

            expect(
                util.inEnum('status', 'active,inactive,active', [...allowed])
            ).toEqual({
                where: { status: { in: ['active', 'inactive'] } },
                storeFilter: { status: ['active', 'inactive'] },
            });
            expect(util.ninEnum('status', 'inactive', [...allowed])).toEqual({
                where: { status: { notIn: ['inactive'] } },
                storeFilter: { status: ['inactive'] },
            });
            expect(util.inEnum('status', '', [...allowed])).toBeUndefined();
        });

        it('dateBetween uses helperDateService and enum type', () => {
            const date = new Date('2024-01-01T00:00:00.000Z');
            helperDateService.checkIso.mockReturnValue(true);
            helperDateService.createFromIso.mockReturnValue(date);

            expect(
                util.dateBetween('createdAt', '2024-01-01', {
                    type: EnumPaginationFilterDateBetweenType.start,
                })
            ).toEqual({
                where: { createdAt: { gte: date } },
                storeFilter: { createdAt: date },
            });
            expect(
                util.dateBetween('createdAt', '2024-01-01', {
                    type: EnumPaginationFilterDateBetweenType.end,
                })
            ).toEqual({
                where: { createdAt: { lte: date } },
                storeFilter: { createdAt: date },
            });
            expect(util.dateBetween('createdAt', '2024-01-01', {})).toEqual({
                where: { createdAt: { equal: date } },
                storeFilter: { createdAt: date },
            });
        });
    });
});
