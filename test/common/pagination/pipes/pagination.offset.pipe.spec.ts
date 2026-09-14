import type { ArgumentMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import { PaginationOffsetPipe } from '@common/pagination/pipes/pagination.offset.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('PaginationOffsetPipe', () => {
    const requestStoreService: Pick<RequestStoreService, 'merge'> = {
        merge: vi.fn(),
    };
    const merge = vi.mocked(requestStoreService.merge);
    const metadata: ArgumentMetadata = { type: 'query' };

    beforeEach(() => vi.resetAllMocks());

    async function createPipe(defaultPerPage = 20) {
        const Pipe = PaginationOffsetPipe(defaultPerPage);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('applies defaults and drops unowned query keys', async () => {
        const pipe = await createPipe(25);

        const result = pipe.transform({ where: { active: true } }, metadata);

        expect(result).toEqual({
            where: { active: true },
            orderBy: undefined,
            limit: 25,
            skip: 0,
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            page: 1,
            perPage: 25,
        });
    });

    it('parses page and perPage into a database offset', async () => {
        const pipe = await createPipe();

        expect(
            pipe.transform({ page: '3', perPage: '10' }, metadata)
        ).toMatchObject({ limit: 10, skip: 20 });
    });

    it.each([
        [{ page: 1.5 }, PaginationInvalidPageException],
        [{ page: 21 }, PaginationPageExceedsMaximumException],
        [{ page: 0 }, PaginationPageCannotBeLessThanOneException],
        [{ perPage: 1.5 }, PaginationInvalidPerPageException],
        [{ perPage: 101 }, PaginationPerPageExceedsMaximumException],
        [{ perPage: 0 }, PaginationPerPageCannotBeLessThanOneException],
    ])('rejects pagination boundary %o', async (input, exceptionType) => {
        const pipe = await createPipe();

        expect(() => pipe.transform(input, metadata)).toThrow(exceptionType);
    });
});
