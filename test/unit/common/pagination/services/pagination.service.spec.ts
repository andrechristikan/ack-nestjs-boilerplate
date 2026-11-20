import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationDefaultOrderBy } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import type { IPaginationOrderBy } from '@common/pagination/interfaces/pagination.interface';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import { createPaginationServiceModule } from '@test/unit/helpers/test.unit.pagination.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';

describe('PaginationService', () => {
    const secret = Buffer.alloc(48, 7).toString('base64url');
    const fingerprint = 'aaaaaaaaaaaaaaaa';
    const resolvedOrderBy: IPaginationOrderBy[] = [
        ...PaginationDefaultOrderBy,
        { id: EnumPaginationOrderDirectionType.desc },
    ];

    const roleDelegate: MockProxy<IDatabaseClient['role']> =
        mock<IDatabaseClient['role']>();

    let service: PaginationService;
    let paginationCursorUtil: PaginationCursorUtil;

    beforeEach(async () => {
        const module = await createPaginationServiceModule(secret);

        service = module.get(PaginationService);
        paginationCursorUtil = module.get(PaginationCursorUtil);
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
            const deferredCount = buildDeferred<number>();
            roleDelegate.count.mockReturnValue(deferredCount.promise as never);
            roleDelegate.findMany.mockResolvedValue(rows as never);

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

            expect(result).toEqual(page);
        });
    });

    describe('cursor', () => {
        const encodedValues = {
            createdAt: { $date: '2026-01-02T03:04:05.000Z' },
            id: 'a'.repeat(24),
        };
        const keyset = {
            OR: [
                { createdAt: { lt: new Date('2026-01-02T03:04:05.000Z') } },
                {
                    createdAt: new Date('2026-01-02T03:04:05.000Z'),
                    id: { lt: 'a'.repeat(24) },
                },
            ],
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
            expect(roleDelegate.findMany).toHaveBeenCalledWith({
                where,
                take: 21,
                orderBy: resolvedOrderBy,
                select,
                include: undefined,
            });
            expect(roleDelegate.count).not.toHaveBeenCalled();
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

            const result = await service.cursor(roleDelegate, {
                fingerprint,
                orderBy: [],
                limit: 1,
            });

            expect(result).toEqual({
                type: 'cursor',
                cursor: expect.any(String),
                perPage: 1,
                hasNext: true,
                data: [rows[0]],
            });
            expect(paginationCursorUtil.open(result.cursor!)).toEqual({
                values: {
                    createdAt: { $date: '2026-01-02T03:04:05.000Z' },
                    id: '1',
                },
                fingerprint,
            });
        });

        it('joins where and the keyset by AND on a page whose fingerprint matches', async () => {
            const where = { name: 'a' };
            roleDelegate.findMany.mockResolvedValue([] as never);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: paginationCursorUtil.seal({
                    values: encodedValues,
                    fingerprint,
                }),
                where,
                orderBy: [],
                limit: 20,
            });

            expect(roleDelegate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { AND: [where, keyset] },
                })
            );
        });

        it('keeps the keyset alone in AND when the caller sent no where', async () => {
            roleDelegate.findMany.mockResolvedValue([] as never);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: paginationCursorUtil.seal({
                    values: encodedValues,
                    fingerprint,
                }),
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
            const deferredCount = buildDeferred<number>();
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
            roleDelegate.findMany.mockResolvedValue([] as never);
            roleDelegate.count.mockResolvedValue(3);

            await service.cursor(roleDelegate, {
                fingerprint,
                cursor: paginationCursorUtil.seal({
                    values: encodedValues,
                    fingerprint,
                }),
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
            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    cursor: paginationCursorUtil.seal({
                        values: encodedValues,
                        fingerprint: 'bbbbbbbbbbbbbbbb',
                    }),
                    orderBy: [],
                    limit: 20,
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
            });
            expect(roleDelegate.findMany).not.toHaveBeenCalled();
        });

        it('throws invalidCursorData when the token values do not match the order by terms', async () => {
            await expect(
                service.cursor(roleDelegate, {
                    fingerprint,
                    cursor: paginationCursorUtil.seal({
                        values: { id: 'x' },
                        fingerprint,
                    }),
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
            const invalidModule =
                await createPaginationServiceModule('invalid-secret');
            const invalidService = invalidModule.get(PaginationService);
            roleDelegate.findMany.mockResolvedValue([
                { id: '1', createdAt: new Date('2026-01-02T03:04:05.000Z') },
                { id: '2', createdAt: new Date('2026-01-02T03:04:04.000Z') },
            ] as never);

            await expect(
                invalidService.cursor(roleDelegate, {
                    fingerprint,
                    orderBy: [],
                    limit: 1,
                })
            ).rejects.toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
            });
        });
    });
});
