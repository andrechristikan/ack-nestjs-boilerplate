import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperHashService } from '@common/helper/services/helper.hash.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationFailedToDecodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-decode-cursor.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import type { IPaginationRepository } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';

describe('PaginationService', () => {
    const helperHashService = {
        sha256Hash: vi.fn<HelperHashService['sha256Hash']>(),
    } satisfies Pick<HelperHashService, 'sha256Hash'>;
    const repository: IPaginationRepository = {
        findMany: vi.fn(),
        count: vi.fn(),
    };
    const findMany = vi.mocked(repository.findMany);
    const count = vi.mocked(repository.count);

    let service: PaginationService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperHashService.sha256Hash.mockReturnValue(
            'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationService,
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        service = moduleRef.get(PaginationService);
    });

    it('returns offset metadata and delegates the bounded database query', async () => {
        count.mockResolvedValue(25);
        findMany.mockResolvedValue([{ id: 'one' }]);

        const result = await service.offset<{ id: string }>(repository, {
            where: { active: true },
            skip: 10,
            limit: 10,
            include: { role: true },
        });

        expect(result).toEqual({
            type: EnumPaginationType.offset,
            count: 25,
            perPage: 10,
            page: 2,
            totalPage: 3,
            hasNext: true,
            hasPrevious: true,
            nextPage: 3,
            previousPage: 1,
            data: [{ id: 'one' }],
        });
        expect(findMany).toHaveBeenCalledWith({
            where: { active: true },
            skip: 10,
            take: 10,
            orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
            include: { role: true },
        });
    });

    it('appends the cursor field as a stable tiebreaker and emits a next cursor', async () => {
        count.mockResolvedValue(3);
        findMany.mockResolvedValue([
            { id: 'one', createdAt: new Date('2026-01-01T00:00:00.000Z') },
            { id: 'two', createdAt: new Date('2025-01-01T00:00:00.000Z') },
            { id: 'three', createdAt: new Date('2024-01-01T00:00:00.000Z') },
        ]);

        const result = await service.cursor<{ id: string }>(repository, {
            where: { active: true },
            limit: 2,
            orderBy: [{ createdAt: EnumPaginationOrderDirectionType.asc }],
            includeCount: true,
        });

        expect(findMany).toHaveBeenCalledWith({
            where: { active: true },
            take: 3,
            cursor: undefined,
            skip: 0,
            orderBy: [
                { createdAt: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.asc },
            ],
            include: undefined,
        });
        expect(count).toHaveBeenCalledWith({ where: { active: true } });
        expect(result).toMatchObject({
            type: EnumPaginationType.cursor,
            perPage: 2,
            hasNext: true,
            count: 3,
            data: [
                expect.objectContaining({ id: 'one' }),
                expect.objectContaining({ id: 'two' }),
            ],
        });
        const decoded = JSON.parse(
            Buffer.from(result.cursor!, 'base64url').toString()
        );
        expect(decoded).toEqual({
            cursor: 'two',
            fingerprint: 'abcdef0123456789',
        });
    });

    it('continues from a cursor whose fingerprint matches the current query', async () => {
        const cursor = Buffer.from(
            JSON.stringify({
                cursor: 'previous-id',
                fingerprint: 'abcdef0123456789',
            })
        ).toString('base64url');
        findMany.mockResolvedValue([{ id: 'next-id' }]);

        await service.cursor(repository, {
            limit: 10,
            cursor,
            cursorField: 'id',
        });

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                cursor: { id: 'previous-id' },
                skip: 1,
            })
        );
    });

    it('rejects a cursor created for different pagination parameters', async () => {
        const cursor = Buffer.from(
            JSON.stringify({ cursor: 'id', fingerprint: 'different' })
        ).toString('base64url');

        await expect(
            service.cursor(repository, { limit: 10, cursor })
        ).rejects.toBeInstanceOf(
            PaginationInvalidCursorPaginationParamsException
        );
        expect(findMany).not.toHaveBeenCalled();
    });

    it('maps malformed cursor data to the public cursor-format exception', async () => {
        await expect(
            service.cursor(repository, { limit: 10, cursor: 'not-json' })
        ).rejects.toBeInstanceOf(PaginationFailedToDecodeCursorException);
    });
});
