import type { ArgumentMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    PaginationDefaultOrderBy,
    PaginationStoreKey,
} from '@common/pagination/constants/pagination.constant';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';
import { PaginationOrderPipe } from '@common/pagination/pipes/pagination.order.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('PaginationOrderPipe', () => {
    const requestStoreService: Pick<RequestStoreService, 'merge'> = {
        merge: vi.fn(),
    };
    const merge = vi.mocked(requestStoreService.merge);
    const metadata: ArgumentMetadata = { type: 'query' };

    beforeEach(() => vi.resetAllMocks());

    async function createPipe(availableOrderBy: string[]) {
        const Pipe = PaginationOrderPipe(availableOrderBy);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('parses multiple allowed order terms for an offset query', async () => {
        const pipe = await createPipe(['name', 'createdAt']);

        const result = await pipe.transform(
            {
                limit: 10,
                skip: 20,
                orderBy: ['name:ASC', 'createdAt:desc'],
            },
            metadata
        );

        expect(result).toEqual({
            where: undefined,
            limit: 10,
            skip: 20,
            orderBy: [
                { name: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ],
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            orderBy: result.orderBy,
            availableOrderBy: ['name', 'createdAt'],
        });
    });

    it('uses immutable default ordering when no allow-list is configured', async () => {
        const pipe = await createPipe([]);

        const result = await pipe.transform(
            {
                limit: 10,
                cursor: 'cursor',
                cursorField: 'id',
            },
            metadata
        );

        expect(result).toEqual({
            where: undefined,
            limit: 10,
            cursor: 'cursor',
            cursorField: 'id',
            orderBy: [...PaginationDefaultOrderBy],
        });
    });

    it.each([
        ['unknown:asc', PaginationOrderByNotAllowedException],
        ['name:sideways', PaginationOrderDirectionNotAllowedException],
        ['name', PaginationOrderDirectionNotAllowedException],
    ])('rejects order term %s', async (orderBy, exceptionType) => {
        const pipe = await createPipe(['name']);

        await expect(
            pipe.transform({ limit: 10, skip: 0, orderBy }, metadata)
        ).rejects.toBeInstanceOf(exceptionType);
    });
});
