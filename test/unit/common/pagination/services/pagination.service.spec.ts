import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    buildCursorToken,
    buildRawCursorToken,
    expectDecodeCursorError,
    stubCursorSeal,
} from '@test/unit/helpers/test.unit.pagination-cursor.helper';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { createHash } from 'node:crypto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    PaginationCursorFingerprintLength,
    PaginationDefaultOrderBy,
} from '@common/pagination/constants/pagination.constant';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationFailedToDecodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-decode-cursor.exception';
import type {
    IPaginationOrderBy,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';

describe('PaginationService', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const firstPageAt = new Date('2026-02-03T04:05:06.789Z');

    const fixedFingerprint = 'aaaaaaaaaaaaaaaa';

    const repository: IPaginationRepository = {
        findMany: vi.fn(),
        count: vi.fn(),
    };

    let service: PaginationService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperHashService.sha256Hash.mockReturnValue(fixedFingerprint);
        databaseUtil.checkIdIsValid.mockReturnValue(true);
        helperDateService.checkIso.mockImplementation(
            iso => !Number.isNaN(Date.parse(iso))
        );
        helperDateService.createFromIso.mockImplementation(
            iso => new Date(iso)
        );

        stubCursorSeal(paginationQueryUtil);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationService,
                { provide: HelperHashService, useValue: helperHashService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
            ],
        }).compile();

        service = module.get(PaginationService);
    });

    describe('offsetPage', () => {
        it('reports a middle page with both a next and a previous page', () => {
            const result = service.offsetPage([{ id: '1' }], 50, {
                skip: 20,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 2,
                totalPage: 3,
                hasNext: true,
                hasPrevious: true,
                data: [{ id: '1' }],
                nextPage: 3,
                previousPage: 1,
            });
        });

        it('reports the first page of several with no previous page', () => {
            const result = service.offsetPage([{ id: '1' }], 50, {
                skip: 0,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 1,
                totalPage: 3,
                hasNext: true,
                hasPrevious: false,
                data: [{ id: '1' }],
                nextPage: 2,
            });
        });

        it('reports the last page with no next page', () => {
            const result = service.offsetPage([{ id: '1' }], 50, {
                skip: 40,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 3,
                totalPage: 3,
                hasNext: false,
                hasPrevious: true,
                data: [{ id: '1' }],
                previousPage: 2,
            });
        });

        it('reports a single empty page with no next and no previous page', () => {
            const result = service.offsetPage([], 0, {
                skip: 0,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            });
        });
    });

    describe('offset', () => {
        it('counts and lists in parallel, then pages the result with the default order', async () => {
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: '1' }]
            );

            const result = await service.offset(repository, {
                orderBy: [],
                where: { name: 'a' },
                limit: 20,
                skip: 0,
            });

            expect(result).toEqual(
                expect.objectContaining({
                    type: 'offset',
                    count: 1,
                    data: [{ id: '1' }],
                })
            );
            expect(repository.count).toHaveBeenCalledWith({
                where: { name: 'a' },
            });
            expect(repository.findMany).toHaveBeenCalledWith({
                where: { name: 'a' },
                skip: 0,
                take: 20,
                orderBy: [
                    ...PaginationDefaultOrderBy,
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
                include: undefined,
                select: undefined,
            });
        });

        it('appends the id tiebreaker to an explicit order by using the last term direction', async () => {
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                []
            );

            await service.offset(repository, {
                limit: 20,
                skip: 0,
                orderBy: [{ name: EnumPaginationOrderDirectionType.asc }],
            });

            expect(repository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [
                        { name: EnumPaginationOrderDirectionType.asc },
                        { id: EnumPaginationOrderDirectionType.asc },
                    ],
                })
            );
        });

        it('leaves an order by that already names id unchanged', async () => {
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                []
            );

            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.desc },
            ];

            await service.offset(repository, { limit: 20, skip: 0, orderBy });

            expect(repository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy })
            );
        });
    });

    describe('cursor', () => {
        const entityId = 'a'.repeat(24);
        const createdAtIso = '2026-01-02T03:04:05.000Z';
        const findMany = repository.findMany as ReturnType<typeof vi.fn>;

        it('lists with the default order when no cursor is sent, adding no filter and reading no cursor row', async () => {
            const where = { status: 'active' };
            findMany.mockResolvedValue([{ id: '1' }]);

            const result = await service.cursor(repository, {
                firstPageAt,
                where,
                orderBy: [],
                limit: 20,
            });

            expect(result).toEqual({
                type: 'cursor',
                perPage: 20,
                hasNext: false,
                data: [{ id: '1' }],
            });
            expect(findMany).toHaveBeenCalledWith({
                where,
                take: 21,
                orderBy: [
                    ...PaginationDefaultOrderBy,
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
            });
        });

        it.each([
            {
                direction: EnumPaginationOrderDirectionType.asc,
                value: false,
                operator: 'gt',
                expected: [{ isActive: true }],
            },
            {
                direction: EnumPaginationOrderDirectionType.asc,
                value: true,
                operator: 'gt',
                expected: [],
            },
            {
                direction: EnumPaginationOrderDirectionType.desc,
                value: true,
                operator: 'lt',
                expected: [{ isActive: false }],
            },
            {
                direction: EnumPaginationOrderDirectionType.desc,
                value: false,
                operator: 'lt',
                expected: [],
            },
        ])(
            'pages past a boolean $value sorted $direction with no range operator on it',
            async ({ direction, value, operator, expected }) => {
                const orderBy = [{ isActive: direction }, { id: direction }];
                findMany.mockResolvedValue([]);

                await service.cursor(repository, {
                    firstPageAt,
                    orderBy,
                    limit: 20,
                    cursor: buildCursorToken({
                        values: { isActive: value, id: entityId },
                        fingerprint: fixedFingerprint,
                    }),
                });

                expect(findMany).toHaveBeenCalledWith({
                    where: {
                        AND: [
                            {
                                OR: [
                                    ...expected,
                                    {
                                        isActive: value,
                                        id: { [operator]: entityId },
                                    },
                                ],
                            },
                        ],
                    },
                    take: 21,
                    orderBy,
                });
            }
        );

        it('encodes a false sort value from the last returned row', async () => {
            const orderBy = [
                { isActive: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.asc },
            ];
            findMany.mockResolvedValue([
                { id: '1', isActive: false },
                { id: '2', isActive: false },
            ]);

            const result = await service.cursor(repository, {
                firstPageAt,
                orderBy,
                limit: 1,
            });

            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith({
                values: { isActive: false, id: '1' },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
            expect(result.cursor).toBeDefined();
        });

        it('encodes a next cursor from the last returned row and reports count when includeCount is set', async () => {
            findMany.mockResolvedValue([
                { id: '1', createdAt: new Date(createdAtIso) },
                { id: '2', createdAt: new Date(createdAtIso) },
                { id: '3', createdAt: new Date(createdAtIso) },
            ]);
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

            const result = await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 2,
                includeCount: true,
            });

            expect(result.hasNext).toBe(true);
            expect(result.count).toBe(3);
            expect(result.data).toHaveLength(2);
            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith({
                values: { createdAt: { $date: createdAtIso }, id: '2' },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
            expect(repository.count).toHaveBeenCalledWith({
                where: undefined,
            });
        });

        it('filters the next page past one term', async () => {
            const where = { status: 'active' };
            findMany.mockResolvedValue([{ id: 'b'.repeat(24) }]);

            await service.cursor(repository, {
                firstPageAt,
                where,
                orderBy: [{ id: EnumPaginationOrderDirectionType.asc }],
                limit: 20,
                cursor: buildCursorToken({
                    values: { id: entityId },
                    fingerprint: fixedFingerprint,
                }),
            });

            expect(findMany).toHaveBeenCalledWith({
                where: { AND: [where, { OR: [{ id: { gt: entityId } }] }] },
                take: 21,
                orderBy: [{ id: EnumPaginationOrderDirectionType.asc }],
            });
        });

        it('filters the next page past two terms in mixed directions', async () => {
            findMany.mockResolvedValue([]);

            await service.cursor(repository, {
                firstPageAt,
                orderBy: [
                    { name: EnumPaginationOrderDirectionType.asc },
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
                limit: 20,
                cursor: buildCursorToken({
                    values: { name: 'ann', id: entityId },
                    fingerprint: fixedFingerprint,
                }),
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        AND: [
                            {
                                OR: [
                                    { name: { gt: 'ann' } },
                                    { name: 'ann', id: { lt: entityId } },
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('returns a Date term value as a Date in the next page filter', async () => {
            findMany.mockResolvedValue([]);

            await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                cursor: buildCursorToken({
                    values: {
                        createdAt: { $date: createdAtIso },
                        id: entityId,
                    },
                    fingerprint: fixedFingerprint,
                }),
            });

            const createdAt = new Date(createdAtIso);
            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        AND: [
                            {
                                OR: [
                                    { createdAt: { lt: createdAt } },
                                    { createdAt, id: { lt: entityId } },
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('keeps a string sort value that looks like a date a string', async () => {
            findMany.mockResolvedValue([]);

            await service.cursor(repository, {
                firstPageAt,
                orderBy: [{ name: EnumPaginationOrderDirectionType.asc }],
                limit: 20,
                cursor: buildCursorToken({
                    values: { name: createdAtIso, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        AND: [
                            {
                                OR: [
                                    { name: { gt: createdAtIso } },
                                    {
                                        name: createdAtIso,
                                        id: { gt: entityId },
                                    },
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('reads one page and no cursor row, so a last row that left the filter moves no boundary', async () => {
            findMany.mockResolvedValue([{ id: 'b'.repeat(24) }]);

            await service.cursor(repository, {
                firstPageAt,
                where: { status: 'active' },
                orderBy: [{ id: EnumPaginationOrderDirectionType.asc }],
                limit: 20,
                cursor: buildCursorToken({
                    values: { id: entityId },
                    fingerprint: fixedFingerprint,
                }),
            });

            expect(findMany).toHaveBeenCalledTimes(1);
        });

        it('adds a missing sort field to the select for the read and strips it from the rows', async () => {
            const select = Object.freeze({ name: true });
            findMany.mockResolvedValue([
                { name: 'a', createdAt: new Date(createdAtIso), id: '1' },
                { name: 'b', createdAt: new Date(createdAtIso), id: '2' },
            ]);

            const result = await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 1,
                select,
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    select: { name: true, createdAt: true, id: true },
                })
            );
            expect(select).toEqual({ name: true });
            expect(result.data).toEqual([{ name: 'a' }]);
            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: { createdAt: { $date: createdAtIso }, id: '1' },
                })
            );
            expect(result.cursor).toBeDefined();
        });

        it('passes the caller select through and strips nothing when it already carries every sort field', async () => {
            const select = { id: true, createdAt: true, name: true };
            const rows = [
                { id: '1', createdAt: new Date(createdAtIso), name: 'a' },
            ];
            findMany.mockResolvedValue(rows);

            const result = await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                select,
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({ select })
            );
            expect(result.data).toEqual(rows);
        });

        it('strips nothing and adds no select when the read uses include', async () => {
            const include = { role: true };
            const rows = [
                { id: '1', createdAt: new Date(createdAtIso), role: {} },
            ];
            findMany.mockResolvedValue(rows);

            const result = await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                include,
            });

            expect(findMany).toHaveBeenCalledWith({
                take: 21,
                orderBy: [
                    ...PaginationDefaultOrderBy,
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
                include,
            });
            expect(result.data).toEqual(rows);
        });

        it('rejects a cursor whose fingerprint does not match the current query', async () => {
            const token = buildCursorToken({
                values: { createdAt: { $date: createdAtIso }, id: entityId },
                fingerprint: 'zzzzzzzzzzzzzzzz',
            });

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                cursor: token,
            });

            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
                messagePath: 'pagination.error.invalidCursorPaginationParams',
            });
            expect(findMany).not.toHaveBeenCalled();
        });

        it('rejects an id value that is not a valid id before querying', async () => {
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [{ id: EnumPaginationOrderDirectionType.asc }],
                limit: 20,
                cursor: buildCursorToken({
                    values: { id: 'not-an-id' },
                    fingerprint: fixedFingerprint,
                }),
            });

            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                messagePath: 'pagination.error.invalidCursorData',
            });
            expect(findMany).not.toHaveBeenCalled();
        });

        it('uses a custom cursor field as the tiebreaker', async () => {
            findMany.mockResolvedValue([{ slug: 'a' }]);

            await service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                cursorField: 'slug',
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [
                        ...PaginationDefaultOrderBy,
                        { slug: EnumPaginationOrderDirectionType.desc },
                    ],
                })
            );
        });

        it('raises PaginationInvalidCursorDataException when the last row carries a null sort value', async () => {
            findMany.mockResolvedValue([
                { id: '1', createdAt: null },
                { id: '2', createdAt: null },
            ]);

            const promise = service.cursor(repository, {
                firstPageAt,
                limit: 1,
                orderBy: [],
            });

            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorData
                    ],
                messagePath: 'pagination.error.invalidCursorData',
            });
        });

        it('raises PaginationInvalidCursorDataException when the last row carries no value for a sort term', async () => {
            findMany.mockResolvedValue([
                { createdAt: new Date(createdAtIso) },
                { createdAt: new Date(createdAtIso) },
            ]);

            const promise = service.cursor(repository, {
                firstPageAt,
                limit: 1,
                orderBy: [],
            });

            await expect(promise).rejects.toMatchObject({
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
            });
        });

        it('raises PaginationFailedToEncodeCursorException when a sort value cannot be serialized', async () => {
            findMany.mockResolvedValue([
                { id: 10n, createdAt: new Date(createdAtIso) },
                { id: '2', createdAt: new Date(createdAtIso) },
            ]);

            const promise = service.cursor(repository, {
                firstPageAt,
                limit: 1,
                orderBy: [],
            });

            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.failedToEncodeCursor,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.failedToEncodeCursor
                    ],
                messagePath: 'pagination.error.failedToEncodeCursor',
            });
        });
        it('filters the next page past three terms, each branch holding every prior term equal', async () => {
            const publishedAtIso = '2026-03-04T05:06:07.000Z';
            const publishedAt = new Date(publishedAtIso);
            findMany.mockResolvedValue([]);

            await service.cursor(repository, {
                firstPageAt,
                orderBy: [
                    { publishedAt: EnumPaginationOrderDirectionType.desc },
                    { version: EnumPaginationOrderDirectionType.desc },
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
                limit: 20,
                cursor: buildCursorToken({
                    values: {
                        publishedAt: { $date: publishedAtIso },
                        version: 3,
                        id: entityId,
                    },
                    fingerprint: fixedFingerprint,
                }),
            });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        AND: [
                            {
                                OR: [
                                    { publishedAt: { lt: publishedAt } },
                                    {
                                        publishedAt,
                                        version: { lt: 3 },
                                    },
                                    {
                                        publishedAt,
                                        version: 3,
                                        id: { lt: entityId },
                                    },
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('pages a repeated order by term as one term and reads with the order by as sent', async () => {
            const firstId = 'b'.repeat(24);
            const secondId = 'c'.repeat(24);
            const thirdId = 'd'.repeat(24);
            const createdAt = new Date(createdAtIso);
            const orderBy: IPaginationOrderBy[] = [
                { createdAt: EnumPaginationOrderDirectionType.desc },
                { createdAt: EnumPaginationOrderDirectionType.desc },
            ];
            const resolved: IPaginationOrderBy[] = [
                ...orderBy,
                { id: EnumPaginationOrderDirectionType.desc },
            ];
            findMany.mockResolvedValueOnce([
                { id: firstId, createdAt },
                { id: secondId, createdAt },
                { id: thirdId, createdAt },
            ]);
            findMany.mockResolvedValueOnce([]);

            const firstPage = await service.cursor(repository, {
                firstPageAt,
                orderBy,
                limit: 2,
            });
            const secondPage = await service.cursor(repository, {
                firstPageAt,
                orderBy,
                limit: 2,
                cursor: firstPage.cursor!,
            });

            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith({
                values: { createdAt: { $date: createdAtIso }, id: secondId },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
            expect(secondPage.data).toEqual([]);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                JSON.stringify({ orderBy: resolved })
            );
            expect(findMany).toHaveBeenLastCalledWith({
                where: {
                    AND: [
                        {
                            OR: [
                                { createdAt: { lt: createdAt } },
                                { createdAt, id: { lt: secondId } },
                            ],
                        },
                    ],
                },
                take: 3,
                orderBy: resolved,
            });
        });

        it('raises PaginationInvalidCursorDataException when the read rejects the decoded cursor values', async () => {
            const validationError = new Prisma.PrismaClientValidationError(
                'Invalid value for argument `lt`',
                { clientVersion: 'test' }
            );
            findMany.mockRejectedValue(validationError);

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                cursor: buildCursorToken({
                    values: {
                        createdAt: { $date: createdAtIso },
                        id: entityId,
                    },
                    fingerprint: fixedFingerprint,
                }),
            });

            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                messagePath: 'pagination.error.invalidCursorData',
            });
        });

        it('wraps any other read error with a cursor as an unknown exception carrying it', async () => {
            const readError = new Error('connection lost');
            findMany.mockRejectedValue(readError);

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
                cursor: buildCursorToken({
                    values: {
                        createdAt: { $date: createdAtIso },
                        id: entityId,
                    },
                    fingerprint: fixedFingerprint,
                }),
            });

            await expect(promise).rejects.toMatchObject({
                module: 'app',
                rawError: readError,
            });
        });

        it('wraps a validation error with no cursor as an unknown exception carrying it', async () => {
            const validationError = new Prisma.PrismaClientValidationError(
                'Invalid value for argument `where`',
                { clientVersion: 'test' }
            );
            findMany.mockRejectedValue(validationError);

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
            });

            await expect(promise).rejects.toMatchObject({
                module: 'app',
                rawError: validationError,
            });
        });

        it('rethrows a typed exception from the read unwrapped', async () => {
            const typedError = new PaginationFailedToDecodeCursorException();
            findMany.mockRejectedValue(typedError);

            const promise = service.cursor(repository, {
                firstPageAt,
                orderBy: [],
                limit: 20,
            });

            await expect(promise).rejects.toBe(typedError);
        });
    });

    describe('cursor across pages', () => {
        const findMany = repository.findMany as ReturnType<typeof vi.fn>;
        const orderBy = [{ name: EnumPaginationOrderDirectionType.asc }];
        const rows = [
            { id: 'a'.repeat(24), name: 'a' },
            { id: 'b'.repeat(24), name: 'b' },
        ];

        beforeEach(() => {
            helperHashService.sha256Hash.mockImplementation(value =>
                createHash('sha256').update(value).digest('hex')
            );
        });

        it('serves page 2 with the token of page 1 when where holds the token firstPageAt', async () => {
            findMany.mockResolvedValue(rows);
            const page1 = await service.cursor(repository, {
                where: { expiredAt: { gte: firstPageAt } },
                orderBy,
                limit: 1,
                firstPageAt,
            });
            const opened = paginationQueryUtil.openCursor(page1.cursor!);
            findMany.mockResolvedValue([rows[1]!]);

            const page2 = await service.cursor(repository, {
                where: { expiredAt: { gte: opened.firstPageAt } },
                orderBy,
                limit: 1,
                firstPageAt: opened.firstPageAt,
                cursor: page1.cursor!,
            });

            expect(opened.firstPageAt).toEqual(firstPageAt);
            expect(page2.data).toEqual([rows[1]]);
            expect(findMany).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    where: {
                        AND: [
                            { expiredAt: { gte: firstPageAt } },
                            expect.any(Object),
                        ],
                    },
                })
            );
        });

        it('answers 50202 when where changes between the pages', async () => {
            findMany.mockResolvedValue(rows);
            const page1 = await service.cursor(repository, {
                where: { expiredAt: { gte: firstPageAt } },
                orderBy,
                limit: 1,
                firstPageAt,
            });

            const promise = service.cursor(repository, {
                where: {
                    expiredAt: { gte: new Date('2030-01-01T00:00:00.000Z') },
                },
                orderBy,
                limit: 1,
                firstPageAt,
                cursor: page1.cursor!,
            });

            await expect(promise).rejects.toMatchObject({
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
            });
        });

        it('answers 50202 when orderBy changes between the pages', async () => {
            findMany.mockResolvedValue(rows);
            const page1 = await service.cursor(repository, {
                orderBy,
                limit: 1,
                firstPageAt,
            });

            const promise = service.cursor(repository, {
                orderBy: [{ name: EnumPaginationOrderDirectionType.desc }],
                limit: 1,
                firstPageAt,
                cursor: page1.cursor!,
            });

            await expect(promise).rejects.toMatchObject({
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
            });
        });

        it('writes args.firstPageAt into the next token', async () => {
            findMany.mockResolvedValue(rows);
            const later = new Date('2027-03-04T05:06:07.008Z');

            await service.cursor(repository, {
                orderBy,
                limit: 1,
                firstPageAt: later,
            });

            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith(
                expect.objectContaining({ firstPageAt: later })
            );
        });
    });

    describe('canonicalize', () => {
        it('renders a Date as its ISO string', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            expect(service['canonicalize'](date)).toBe(date.toISOString());
        });

        it('maps every entry of an array', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            expect(service['canonicalize']([date, 'x'])).toEqual([
                date.toISOString(),
                'x',
            ]);
        });

        it('sorts the keys of a plain object recursively', () => {
            expect(
                service['canonicalize']({ b: 1, a: { d: 2, c: 3 } })
            ).toEqual({ a: { c: 3, d: 2 }, b: 1 });
        });

        it('returns a primitive unchanged', () => {
            expect(service['canonicalize']('x')).toBe('x');
            expect(service['canonicalize'](null)).toBeNull();
        });
    });

    describe('fingerprint', () => {
        it('hashes the canonicalized where and orderBy', () => {
            const where = { name: 'a' };
            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            const result = service['fingerprint'](where, orderBy);

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                JSON.stringify({ orderBy, where })
            );
            expect(result).toBe(
                fixedFingerprint.slice(0, PaginationCursorFingerprintLength)
            );
        });

        it('truncates the hash to the configured fingerprint length', () => {
            helperHashService.sha256Hash.mockReturnValue('f'.repeat(64));

            const result = service['fingerprint']({}, []);

            expect(result).toHaveLength(PaginationCursorFingerprintLength);
        });
    });

    describe('encodeCursor', () => {
        const orderBy: IPaginationOrderBy[] = [
            { createdAt: EnumPaginationOrderDirectionType.desc },
            { id: EnumPaginationOrderDirectionType.desc },
        ];

        it('encodes the last row value of every term into a URL-safe token, tagging a Date', () => {
            const createdAt = new Date('2026-01-02T03:04:05.000Z');

            const token = service['encodeCursor'](
                { id: '1', createdAt, name: 'ignored' },
                orderBy,
                fixedFingerprint,
                firstPageAt
            );

            expect(token).toBe(
                buildCursorToken({
                    values: {
                        createdAt: { $date: '2026-01-02T03:04:05.000Z' },
                        id: '1',
                    },
                    fingerprint: fixedFingerprint,
                    firstPageAt: { $date: firstPageAt.toISOString() },
                })
            );
            expect(paginationQueryUtil.sealCursor).toHaveBeenCalledWith({
                values: {
                    createdAt: { $date: '2026-01-02T03:04:05.000Z' },
                    id: '1',
                },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
        });

        it('raises PaginationInvalidCursorDataException when a term value is null', () => {
            let error: unknown;
            try {
                service['encodeCursor'](
                    { id: '1', createdAt: null },
                    orderBy,
                    fixedFingerprint,
                    firstPageAt
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                messagePath: 'pagination.error.invalidCursorData',
            });
        });

        it('raises PaginationInvalidCursorDataException when a term value is absent', () => {
            let error: unknown;
            try {
                service['encodeCursor'](
                    { createdAt: new Date() },
                    orderBy,
                    fixedFingerprint,
                    firstPageAt
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
            });
        });
    });

    describe('decodeCursor', () => {
        const entityId = 'a'.repeat(24);
        const orderBy: IPaginationOrderBy[] = [
            { name: EnumPaginationOrderDirectionType.asc },
            { id: EnumPaginationOrderDirectionType.asc },
        ];
        const values = { name: 'a', id: entityId };

        it('raises PaginationInvalidCursorFormatException for an empty cursor', () => {
            let error: unknown;
            try {
                service['decodeCursor']('', fixedFingerprint, orderBy, 'id');
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                messagePath: 'pagination.error.invalidCursorFormat',
            });
        });

        it('decodes a value it encoded itself, returning a Date tag as a Date', () => {
            const createdAt = new Date('2026-01-02T03:04:05.000Z');
            const dateOrderBy: IPaginationOrderBy[] = [
                { createdAt: EnumPaginationOrderDirectionType.desc },
                { id: EnumPaginationOrderDirectionType.desc },
            ];
            const token = service['encodeCursor'](
                { id: entityId, createdAt },
                dateOrderBy,
                fixedFingerprint,
                firstPageAt
            );

            expect(
                service['decodeCursor'](
                    token,
                    fixedFingerprint,
                    dateOrderBy,
                    'id'
                )
            ).toEqual({
                values: { createdAt, id: entityId },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
        });

        it('raises PaginationInvalidCursorPaginationParamsException when the fingerprint differs', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({ values, fingerprint: 'zzzzzzzzzzzzzzzz' }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorPaginationParams
            );
        });

        it('raises PaginationInvalidCursorDataException when a value is an operator object', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: { not: 'x' }, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when the token names a term the order does not', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { ...values, role: 'admin' },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when the token omits a term of the order', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when a __proto__ key stands in for a term of the order', () => {
            expectDecodeCursorError(
                service,
                buildRawCursorToken(
                    `{"values":{"__proto__":"a","id":"${entityId}"},"fingerprint":"${fixedFingerprint}"}`
                ),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when a value is null', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: null, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when a value is an array', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: ['a'], id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('returns a boolean value as given', () => {
            const decoded = service['decodeCursor'](
                buildCursorToken({
                    values: { name: false, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                'id'
            );

            expect(decoded.values).toEqual({ name: false, id: entityId });
        });

        it('raises PaginationInvalidCursorDataException when a number value is not finite', () => {
            expectDecodeCursorError(
                service,
                buildRawCursorToken(
                    `{"values":{"name":1e999,"id":"${entityId}"},"fingerprint":"${fixedFingerprint}"}`
                ),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when a Date tag does not hold a valid date string', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: { $date: 'not-a-date' }, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: { $date: 5 }, id: entityId },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when a Date tag carries an extra key', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: {
                        name: { $date: '2026-01-02T03:04:05.000Z', extra: 1 },
                        id: entityId,
                    },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when the id value is not a string', () => {
            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: 'a', id: 5 },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
        });

        it('raises PaginationInvalidCursorDataException when the id value is not a valid id', () => {
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            expectDecodeCursorError(
                service,
                buildCursorToken({
                    values: { name: 'a', id: 'not-an-id' },
                    fingerprint: fixedFingerprint,
                }),
                fixedFingerprint,
                orderBy,
                EnumPaginationStatusCodeError.invalidCursorData
            );
            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'not-an-id'
            );
        });

        it('skips the id check when the cursor field is not id', () => {
            databaseUtil.checkIdIsValid.mockReturnValue(false);
            const slugOrderBy: IPaginationOrderBy[] = [
                { slug: EnumPaginationOrderDirectionType.asc },
            ];
            const token = buildCursorToken({
                values: { slug: 'a-slug' },
                fingerprint: fixedFingerprint,
                firstPageAt: { $date: firstPageAt.toISOString() },
            });

            expect(
                service['decodeCursor'](
                    token,
                    fixedFingerprint,
                    slugOrderBy,
                    'slug'
                )
            ).toEqual({
                values: { slug: 'a-slug' },
                fingerprint: fixedFingerprint,
                firstPageAt,
            });
            expect(databaseUtil.checkIdIsValid).not.toHaveBeenCalled();
        });
    });

    describe('resolveOrderBy', () => {
        it('falls back to the default order plus the tiebreaker when an empty list is sent', () => {
            expect(service['resolveOrderBy']([], 'id')).toEqual([
                ...PaginationDefaultOrderBy,
                { id: EnumPaginationOrderDirectionType.desc },
            ]);
        });

        it('returns the order unchanged when it already carries the tiebreak field', () => {
            const orderBy: IPaginationOrderBy[] = [
                { id: EnumPaginationOrderDirectionType.asc },
            ];

            expect(service['resolveOrderBy'](orderBy, 'id')).toBe(orderBy);
        });

        it('appends the tiebreak field using the last term direction', () => {
            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            expect(service['resolveOrderBy'](orderBy, 'id')).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.asc },
            ]);
        });
    });
});
