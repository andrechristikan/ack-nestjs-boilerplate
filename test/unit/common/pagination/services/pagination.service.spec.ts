import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationDefaultCursorField } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';

describe('PaginationService', () => {
    const paginationCursorUtil: MockProxy<PaginationCursorUtil> =
        mock<PaginationCursorUtil>();
    const paginationOffsetUtil: MockProxy<PaginationOffsetUtil> =
        mock<PaginationOffsetUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const fingerprint = 'aaaaaaaaaaaaaaaa';
    const resolvedOrderBy: IPaginationOrderBy[] = [
        { name: EnumPaginationOrderDirectionType.asc },
        { id: EnumPaginationOrderDirectionType.asc },
    ];

    const roleDelegate: MockProxy<IDatabaseClient['role']> =
        mock<IDatabaseClient['role']>();

    let service: PaginationService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.resolveTiebreak.mockReturnValue(resolvedOrderBy);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationService,
                {
                    provide: PaginationCursorUtil,
                    useValue: paginationCursorUtil,
                },
                {
                    provide: PaginationOffsetUtil,
                    useValue: paginationOffsetUtil,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
            ],
        }).compile();

        service = module.get(PaginationService);
    });

    describe('offset', () => {
        it('counts and lists in parallel, then pages the result with the resolved order', async () => {
            const rows = [{ id: '1' }];
            const page = {
                type: EnumPaginationType.offset as const,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: rows,
            };
            const deferredCount = Promise.withResolvers<number>();
            roleDelegate.count.mockReturnValue(deferredCount.promise as never);
            roleDelegate.findMany.mockResolvedValue(rows as never);
            paginationOffsetUtil.page.mockReturnValue(page);

            const pending = service.offset(roleDelegate, {
                orderBy: [],
                where: { name: 'a' },
                limit: 20,
                skip: 0,
            });

            expect(roleDelegate.count).toHaveBeenCalledWith({
                where: { name: 'a' },
            });
            expect(roleDelegate.findMany).toHaveBeenCalledWith({
                where: { name: 'a' },
                skip: 0,
                take: 20,
                orderBy: resolvedOrderBy,
                include: undefined,
                select: undefined,
            });

            deferredCount.resolve(1);
            const result = await pending;

            expectTypeOf(result.data[0]!.name).toBeString();

            expect(result).toBe(page);
            expect(paginationOffsetUtil.page).toHaveBeenCalledWith(rows, 1, {
                skip: 0,
                limit: 20,
            });
            expect(paginationQueryUtil.resolveTiebreak).toHaveBeenCalledWith(
                [],
                PaginationDefaultCursorField
            );
        });
    });

    describe('cursor', () => {
        const encodedValues = {
            createdAt: { $date: '2026-01-02T03:04:05.000Z' },
            id: 'a'.repeat(24),
        };

        it('reads limit plus one with the caller where, order and select on a first page', async () => {
            const where = { name: 'a' };
            const select = { id: true, name: true };
            roleDelegate.findMany.mockResolvedValue([
                { id: '1', name: 'a' },
            ] as never);

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                where,
                select,
                orderBy: [],
                limit: 20,
            });

            expectTypeOf(result.data[0]!.name).toBeString();
            expect(result).toEqual({
                type: 'cursor',
                perPage: 20,
                hasNext: false,
                data: [{ id: '1', name: 'a' }],
            });
            expect(paginationQueryUtil.resolveTiebreak).toHaveBeenCalledWith(
                [],
                PaginationDefaultCursorField
            );
            expect(roleDelegate.findMany).toHaveBeenCalledWith({
                where,
                take: 21,
                orderBy: resolvedOrderBy,
                select,
                include: undefined,
            });
            expect(roleDelegate.count).not.toHaveBeenCalled();
            expect(paginationCursorUtil.open).not.toHaveBeenCalled();
        });

        it('returns rows unstripped when the select is passed through', async () => {
            const rows = [{ id: '1', name: 'a' }];
            roleDelegate.findMany.mockResolvedValue(rows as never);

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                select: { id: true, name: true },
                orderBy: [],
                limit: 20,
            });

            expect(result.data).toEqual(rows);
        });

        it('slices the extra row and seals a token holding every order by term', async () => {
            const rows = [
                { id: '1', createdAt: new Date('2026-01-02T03:04:05.000Z') },
                { id: '2', createdAt: new Date('2026-01-02T03:04:04.000Z') },
            ];
            roleDelegate.findMany.mockResolvedValue(rows as never);
            paginationCursorUtil.encodeValues.mockReturnValue(encodedValues);
            paginationCursorUtil.seal.mockReturnValue('sealed');

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                orderBy: [],
                limit: 1,
            });

            expect(result).toEqual({
                type: 'cursor',
                cursor: 'sealed',
                perPage: 1,
                hasNext: true,
                data: [rows[0]],
            });
            expect(paginationCursorUtil.encodeValues).toHaveBeenCalledWith(
                rows[0],
                resolvedOrderBy
            );
            expect(paginationCursorUtil.seal).toHaveBeenCalledWith({
                values: encodedValues,
                fingerprint,
            });
        });

        it('joins where and the keyset by AND on a page whose fingerprint matches', async () => {
            const where = { name: 'a' };
            const keyset = { OR: [{ id: { lt: 'x' } }] };
            paginationCursorUtil.open.mockReturnValue({
                values: encodedValues,
                fingerprint,
            });
            paginationCursorUtil.decodeValues.mockReturnValue({
                createdAt: new Date('2026-01-02T03:04:05.000Z'),
                id: 'x',
            });
            paginationCursorUtil.keyset.mockReturnValue(keyset);
            roleDelegate.findMany.mockResolvedValue([] as never);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: 'token',
                where,
                orderBy: [],
                limit: 20,
            });

            expect(paginationCursorUtil.open).toHaveBeenCalledWith('token');
            expect(paginationCursorUtil.decodeValues).toHaveBeenCalledWith(
                encodedValues,
                resolvedOrderBy
            );
            expect(roleDelegate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { AND: [where, keyset] },
                })
            );
        });

        it('keeps the keyset alone in AND when the caller sent no where', async () => {
            const keyset = { OR: [] };
            paginationCursorUtil.open.mockReturnValue({
                values: encodedValues,
                fingerprint,
            });
            paginationCursorUtil.decodeValues.mockReturnValue({ id: 'x' });
            paginationCursorUtil.keyset.mockReturnValue(keyset);
            roleDelegate.findMany.mockResolvedValue([] as never);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: 'token',
                orderBy: [],
                limit: 20,
            });

            expect(roleDelegate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { AND: [keyset] } })
            );
        });

        it('counts the where alongside the read and returns count when includeCount is true', async () => {
            const where = { name: 'a' };
            roleDelegate.findMany.mockResolvedValue([
                { id: '1', name: 'a' },
            ] as never);
            const deferredCount = Promise.withResolvers<number>();
            roleDelegate.count.mockReturnValue(deferredCount.promise as never);

            const pending = service.cursor(roleDelegate, {
                fingerprint,
                where,
                select: { id: true, name: true },
                includeCount: true,
                orderBy: [],
                limit: 20,
            });

            expect(roleDelegate.findMany).toHaveBeenCalledTimes(1);
            expect(roleDelegate.count).toHaveBeenCalledTimes(1);
            expect(roleDelegate.count).toHaveBeenCalledWith({ where });

            deferredCount.resolve(7);
            const result = await pending;

            expectTypeOf(result.data[0]!.name).toBeString();
            expect(result.count).toBe(7);
        });

        it('returns count 0 when includeCount is true and nothing matches', async () => {
            roleDelegate.findMany.mockResolvedValue([] as never);
            roleDelegate.count.mockResolvedValue(0);

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                includeCount: true,
                orderBy: [],
                limit: 20,
            });

            expect(result).toHaveProperty('count', 0);
        });

        it('counts the where without the keyset on a later page', async () => {
            const where = { name: 'a' };
            const keyset = { OR: [{ id: { lt: 'x' } }] };
            paginationCursorUtil.open.mockReturnValue({
                values: encodedValues,
                fingerprint,
            });
            paginationCursorUtil.decodeValues.mockReturnValue({
                createdAt: new Date('2026-01-02T03:04:05.000Z'),
                id: 'x',
            });
            paginationCursorUtil.keyset.mockReturnValue(keyset);
            roleDelegate.findMany.mockResolvedValue([] as never);
            roleDelegate.count.mockResolvedValue(3);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: 'token',
                where,
                includeCount: true,
                orderBy: [],
                limit: 20,
            });

            expect(roleDelegate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { AND: [where, keyset] },
                })
            );
            expect(roleDelegate.count).toHaveBeenCalledWith({ where });
        });

        it('reads no count when includeCount is false', async () => {
            roleDelegate.findMany.mockResolvedValue([] as never);

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                includeCount: false,
                orderBy: [],
                limit: 20,
            });

            expect(roleDelegate.count).not.toHaveBeenCalled();
            expect(result).not.toHaveProperty('count');
        });

        it('throws failedToDecodeCursor when the token does not open', async () => {
            paginationCursorUtil.open.mockReturnValue(null);

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    cursor: 'token',
                    orderBy: [],
                    limit: 20,
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
            });
            expect(roleDelegate.findMany).not.toHaveBeenCalled();
        });

        it('throws invalidCursorPaginationParams when the token fingerprint differs from the request', async () => {
            paginationCursorUtil.open.mockReturnValue({
                values: encodedValues,
                fingerprint: 'bbbbbbbbbbbbbbbb',
            });

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    cursor: 'token',
                    orderBy: [],
                    limit: 20,
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
            });
            expect(paginationCursorUtil.decodeValues).not.toHaveBeenCalled();
            expect(roleDelegate.findMany).not.toHaveBeenCalled();
        });

        it('throws invalidCursorData when the token values do not match the order by terms', async () => {
            paginationCursorUtil.open.mockReturnValue({
                values: encodedValues,
                fingerprint,
            });
            paginationCursorUtil.decodeValues.mockReturnValue(null);

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    cursor: 'token',
                    orderBy: [],
                    limit: 20,
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
            });
            expect(roleDelegate.findMany).not.toHaveBeenCalled();
        });

        it('throws invalidCursorData when the last row has a null sort value', async () => {
            roleDelegate.findMany.mockResolvedValue([
                { id: '1' },
                { id: '2' },
            ] as never);
            paginationCursorUtil.encodeValues.mockReturnValue(null);

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    orderBy: [],
                    limit: 1,
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
            });
            expect(paginationCursorUtil.seal).not.toHaveBeenCalled();
        });

        it('lets a findMany rejection propagate unchanged', async () => {
            const failure = new Error('db down');
            roleDelegate.findMany.mockRejectedValue(failure);

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    orderBy: [],
                    limit: 20,
                })
            ).rejects.toBe(failure);
        });

        it('lets a seal failure propagate unchanged', async () => {
            const failure = new Error('crypto');
            roleDelegate.findMany.mockResolvedValue([
                { id: '1' },
                { id: '2' },
            ] as never);
            paginationCursorUtil.encodeValues.mockReturnValue(encodedValues);
            paginationCursorUtil.seal.mockImplementation(() => {
                throw failure;
            });

            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    orderBy: [],
                    limit: 1,
                })
            ).rejects.toBe(failure);
        });
    });
});
