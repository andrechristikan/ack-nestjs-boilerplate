import type { ArgumentMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    PaginationMaxCursorLength,
    PaginationStoreKey,
} from '@common/pagination/constants/pagination.constant';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';
import { PaginationCursorPipe } from '@common/pagination/pipes/pagination.cursor.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('PaginationCursorPipe', () => {
    const requestStoreService: Pick<RequestStoreService, 'merge'> = {
        merge: vi.fn(),
    };
    const merge = vi.mocked(requestStoreService.merge);
    const metadata: ArgumentMetadata = { type: 'query' };

    beforeEach(() => vi.resetAllMocks());

    async function createPipe(defaultPerPage = 20, cursorField = 'id') {
        const Pipe = PaginationCursorPipe(defaultPerPage, cursorField);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('trims a URL-safe cursor and returns only owned query fields', async () => {
        const pipe = await createPipe(25, 'tokenId');

        const result = await pipe.transform(
            {
                cursor: '  abc_123-def  ',
                perPage: '10',
                where: { active: true },
            },
            metadata
        );

        expect(result).toEqual({
            where: { active: true },
            orderBy: undefined,
            limit: 10,
            cursor: 'abc_123-def',
            cursorField: 'tokenId',
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            perPage: 10,
            cursor: 'abc_123-def',
        });
    });

    it.each([undefined, '', '   '])(
        'normalizes absent cursor %s to undefined',
        async cursor => {
            const pipe = await createPipe();
            await expect(
                pipe.transform({ cursor }, metadata)
            ).resolves.toMatchObject({ cursor: undefined, limit: 20 });
        }
    );

    it.each([
        [{ cursor: 'not+safe' }, PaginationInvalidCursorFormatException],
        [
            { cursor: 'a'.repeat(PaginationMaxCursorLength + 1) },
            PaginationCursorTooLongException,
        ],
        [{ perPage: 1.5 }, PaginationInvalidPerPageException],
        [{ perPage: 101 }, PaginationPerPageExceedsMaximumException],
        [{ perPage: 0 }, PaginationPerPageCannotBeLessThanOneException],
    ])('rejects cursor boundary %o', async (input, exceptionType) => {
        const pipe = await createPipe();
        await expect(pipe.transform(input, metadata)).rejects.toBeInstanceOf(
            exceptionType
        );
    });
});
