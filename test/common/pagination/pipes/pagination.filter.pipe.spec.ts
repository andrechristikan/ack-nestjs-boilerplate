import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationFilterDateBetweenType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';
import { PaginationFilterInvalidValueException } from '@common/pagination/exceptions/pagination.filter-invalid-value.exception';
import {
    PaginationQueryFilterDatePipe,
    PaginationQueryFilterEqualPipe,
    PaginationQueryFilterInEnumPipe,
    PaginationQueryFilterNinEnumPipe,
    PaginationQueryFilterNotEqualPipe,
} from '@common/pagination/pipes/pagination.filter.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('Pagination filter pipes', () => {
    const requestStoreService: Pick<RequestStoreService, 'get' | 'merge'> = {
        get: vi.fn(),
        merge: vi.fn(),
    };
    const storeGet = vi.mocked(requestStoreService.get);
    const merge = vi.mocked(requestStoreService.merge);
    const helperDateService = {
        checkIso: vi.fn<HelperDateService['checkIso']>(),
        createFromIso: vi.fn<HelperDateService['createFromIso']>(),
    } satisfies Pick<HelperDateService, 'checkIso' | 'createFromIso'>;
    const metadata: ArgumentMetadata = { type: 'query', data: 'status' };

    beforeEach(() => {
        vi.resetAllMocks();
        storeGet.mockReturnValue(null);
    });

    async function resolvePipe(Pipe: Type<PipeTransform>) {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                HelperArrayService,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('deduplicates and validates enum values into an in filter', async () => {
        const pipe = await resolvePipe(
            PaginationQueryFilterInEnumPipe(['active', 'inactive'], {
                customField: 'state',
            })
        );

        await expect(
            pipe.transform('active, inactive,active', metadata)
        ).resolves.toEqual({
            state: { in: ['active', 'inactive'] },
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            filters: { status: ['active', 'inactive'] },
        });
    });

    it('builds a notIn filter and preserves existing metadata filters', async () => {
        storeGet.mockReturnValue({ filters: { role: 'admin' } });
        const pipe = await resolvePipe(
            PaginationQueryFilterNinEnumPipe(['active', 'inactive'])
        );

        await expect(pipe.transform('inactive', metadata)).resolves.toEqual({
            status: { notIn: ['inactive'] },
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            filters: { role: 'admin', status: ['inactive'] },
        });
    });

    it('rejects a value outside the enum allow-list', async () => {
        const pipe = await resolvePipe(
            PaginationQueryFilterInEnumPipe(['active'])
        );

        await expect(
            pipe.transform('unknown', metadata)
        ).rejects.toBeInstanceOf(PaginationFilterInvalidValueEnumException);
    });

    it.each([
        [{ isBoolean: true } as const, ' true ', true],
        [{ isNumber: true } as const, ' 42.5 ', 42.5],
        [undefined, ' active ', 'active'],
    ])(
        'coerces an equality filter with options %o',
        async (options, value, expected) => {
            const pipe = await resolvePipe(
                PaginationQueryFilterEqualPipe(options)
            );

            await expect(pipe.transform(value, metadata)).resolves.toEqual({
                status: { equals: expected },
            });
        }
    );

    it('builds a typed not-equal filter', async () => {
        const pipe = await resolvePipe(
            PaginationQueryFilterNotEqualPipe({ isBoolean: true })
        );

        await expect(pipe.transform('false', metadata)).resolves.toEqual({
            status: { not: false },
        });
    });

    it.each([
        [{ isBoolean: true } as const, 'yes'],
        [{ isNumber: true } as const, 'not-a-number'],
    ])('rejects invalid coercion %s', async (options, value) => {
        const pipe = await resolvePipe(PaginationQueryFilterEqualPipe(options));

        await expect(pipe.transform(value, metadata)).rejects.toBeInstanceOf(
            PaginationFilterInvalidValueException
        );
    });

    it.each([
        [EnumPaginationFilterDateBetweenType.start, 'gte'],
        [EnumPaginationFilterDateBetweenType.end, 'lte'],
    ] as const)('maps date range %s to %s', async (type, operation) => {
        const date = new Date('2026-09-10T00:00:00.000Z');
        helperDateService.checkIso.mockReturnValue(true);
        helperDateService.createFromIso.mockReturnValue(date);
        const pipe = await resolvePipe(PaginationQueryFilterDatePipe({ type }));

        await expect(pipe.transform('2026-09-10', metadata)).resolves.toEqual({
            status: { [operation]: date },
        });
    });

    it('rejects an invalid ISO date', async () => {
        helperDateService.checkIso.mockReturnValue(false);
        const pipe = await resolvePipe(PaginationQueryFilterDatePipe());

        await expect(
            pipe.transform('invalid', metadata)
        ).rejects.toBeInstanceOf(PaginationFilterInvalidValueException);
    });
});
