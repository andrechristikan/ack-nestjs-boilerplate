import type { ArgumentMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationSearchPipe } from '@common/pagination/pipes/pagination.search.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client';

describe('PaginationSearchPipe', () => {
    const requestStoreService: Pick<RequestStoreService, 'merge'> = {
        merge: vi.fn(),
    };
    const merge = vi.mocked(requestStoreService.merge);
    const metadata: ArgumentMetadata = { type: 'query' };

    beforeEach(() => vi.resetAllMocks());

    async function createPipe(availableSearch: string[]) {
        const Pipe = PaginationSearchPipe(availableSearch);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                Pipe,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(Pipe);
    }

    it('builds case-insensitive search predicates for allowed fields', async () => {
        const pipe = await createPipe(['name', 'email']);

        const result = await pipe.transform(
            {
                search: '  ada  ',
                page: '2',
                perPage: '10',
                orderBy: 'name:asc',
                include: 'client-value',
            },
            metadata
        );

        expect(result).toEqual({
            page: '2',
            perPage: '10',
            cursor: undefined,
            orderBy: 'name:asc',
            where: {
                OR: [
                    {
                        name: {
                            contains: 'ada',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        email: {
                            contains: 'ada',
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            },
        });
        expect(merge).toHaveBeenCalledWith(PaginationStoreKey, {
            availableSearch: ['name', 'email'],
            search: 'ada',
        });
    });

    it.each([{ availableSearch: [] }, { availableSearch: ['name'] }])(
        'does not create an empty search predicate for allow-list %o',
        async ({ availableSearch }) => {
            const pipe = await createPipe(availableSearch);

            const result = await pipe.transform(
                { search: '   ', page: 1 },
                metadata
            );

            expect(result).toEqual({
                page: 1,
                perPage: undefined,
                cursor: undefined,
                orderBy: undefined,
            });
        }
    );
});
