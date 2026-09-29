import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    PaginationCursorFingerprintLength,
    PaginationDefaultOrderBy,
} from '@common/pagination/constants/pagination.constant';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidCursorDataException } from '@common/pagination/exceptions/pagination.invalid-cursor-data.exception';
import { PaginationFailedToEncodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-encode-cursor.exception';
import { PaginationFailedToDecodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-decode-cursor.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import type {
    IPaginationCursorValue,
    IPaginationOrderBy,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';

describe('PaginationService', () => {
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    const fixedFingerprint = 'aaaaaaaaaaaaaaaa';

    const repository: IPaginationRepository = {
        findMany: vi.fn(),
        count: vi.fn(),
    };

    let service: PaginationService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperHashService.sha256Hash.mockReturnValue(fixedFingerprint);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationService,
                { provide: HelperHashService, useValue: helperHashService },
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
                orderBy: [...PaginationDefaultOrderBy],
                include: undefined,
                select: undefined,
            });
        });

        it('passes an explicit order by through unchanged', async () => {
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                []
            );

            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            await service.offset(repository, {
                limit: 20,
                skip: 0,
                orderBy,
            });

            expect(repository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy })
            );
        });
    });

    describe('cursor', () => {
        it('lists with the default order when no cursor is sent and reports no next page', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: '1' }]
            );

            const result = await service.cursor(repository, {
                limit: 20,
            });

            expect(result).toEqual({
                type: 'cursor',
                cursor: undefined,
                perPage: 20,
                hasNext: false,
                data: [{ id: '1' }],
            });
            expect(repository.findMany).toHaveBeenCalledWith({
                where: undefined,
                take: 21,
                cursor: undefined,
                skip: 0,
                orderBy: [
                    ...PaginationDefaultOrderBy,
                    { id: EnumPaginationOrderDirectionType.desc },
                ],
                include: undefined,
                select: undefined,
            });
        });

        it('encodes a next cursor and reports count when includeCount is set', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: '1' }, { id: '2' }, { id: '3' }]
            );
            (repository.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

            const result = await service.cursor(repository, {
                limit: 2,
                includeCount: true,
            });

            expect(result.hasNext).toBe(true);
            expect(result.count).toBe(3);
            expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
            expect(typeof result.cursor).toBe('string');
            expect(repository.count).toHaveBeenCalledWith({
                where: undefined,
            });
        });

        it('accepts a cursor whose fingerprint matches the current query', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: '2' }]
            );

            const token = service['encodeCursor']({
                cursor: '1',
                fingerprint: fixedFingerprint,
            });

            const result = await service.cursor(repository, {
                limit: 20,
                cursor: token,
            });

            expect(result.data).toEqual([{ id: '2' }]);
            expect(repository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    cursor: { id: '1' },
                    skip: 1,
                })
            );
        });

        it('rejects a cursor whose fingerprint does not match the current query', async () => {
            const token = service['encodeCursor']({
                cursor: '1',
                fingerprint: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
            });

            const promise = service.cursor(repository, {
                limit: 20,
                cursor: token,
            });

            await expect(promise).rejects.toBeInstanceOf(
                PaginationInvalidCursorPaginationParamsException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidCursorPaginationParams,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError
                            .invalidCursorPaginationParams
                    ],
                messagePath: 'pagination.error.invalidCursorPaginationParams',
            });
        });

        it('uses a custom cursor field when named', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ slug: 'a' }]
            );

            await service.cursor(repository, {
                limit: 20,
                cursorField: 'slug',
            });

            expect(repository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [
                        ...PaginationDefaultOrderBy,
                        { slug: EnumPaginationOrderDirectionType.desc },
                    ],
                })
            );
        });

        it('raises PaginationInvalidCursorDataException when the next item carries no cursor field value', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: null }, { id: '2' }]
            );

            const promise = service.cursor(repository, { limit: 1 });

            await expect(promise).rejects.toBeInstanceOf(
                PaginationInvalidCursorDataException
            );
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

        it('raises PaginationFailedToEncodeCursorException when the cursor value cannot be serialized', async () => {
            (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                [{ id: 10n }, { id: '2' }]
            );

            const promise = service.cursor(repository, { limit: 1 });

            await expect(promise).rejects.toBeInstanceOf(
                PaginationFailedToEncodeCursorException
            );
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
        it('raises PaginationInvalidCursorDataException when cursor is null', () => {
            let error: unknown;
            try {
                service['encodeCursor']({
                    cursor: null as unknown as string,
                    fingerprint: fixedFingerprint,
                });
            } catch (caught) {
                error = caught;
            }

            expect(error).toBeInstanceOf(PaginationInvalidCursorDataException);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorData
                    ],
                messagePath: 'pagination.error.invalidCursorData',
            });
        });

        it('encodes a valid value into a URL-safe token', () => {
            const token = service['encodeCursor']({
                cursor: '1',
                fingerprint: fixedFingerprint,
            });

            expect(token).not.toMatch(/[+/=]/);
        });
    });

    describe('decodeCursor', () => {
        it('raises PaginationInvalidCursorFormatException for an empty cursor', () => {
            let error: unknown;
            try {
                service['decodeCursor']('');
            } catch (caught) {
                error = caught;
            }

            expect(error).toBeInstanceOf(
                PaginationInvalidCursorFormatException
            );
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                messagePath: 'pagination.error.invalidCursorFormat',
            });
        });

        it('raises PaginationFailedToDecodeCursorException for a cursor that is not valid base64 JSON', () => {
            const notJson = Buffer.from('not-json')
                .toString('base64')
                .replaceAll('+', '-')
                .replaceAll('/', '_')
                .replaceAll('=', '');

            let error: unknown;
            try {
                service['decodeCursor'](notJson);
            } catch (caught) {
                error = caught;
            }

            expect(error).toBeInstanceOf(
                PaginationFailedToDecodeCursorException
            );
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.failedToDecodeCursor
                    ],
                messagePath: 'pagination.error.failedToDecodeCursor',
            });
        });

        it('raises PaginationInvalidCursorDataException when the decoded value carries no fingerprint', () => {
            const missingFingerprint = Buffer.from(
                JSON.stringify({ cursor: '1' })
            )
                .toString('base64')
                .replaceAll('+', '-')
                .replaceAll('/', '_')
                .replaceAll('=', '');

            let error: unknown;
            try {
                service['decodeCursor'](missingFingerprint);
            } catch (caught) {
                error = caught;
            }

            expect(error).toBeInstanceOf(PaginationInvalidCursorDataException);
            expect(error).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorData
                    ],
                messagePath: 'pagination.error.invalidCursorData',
            });
        });

        it('decodes a value it encoded itself', () => {
            const value: IPaginationCursorValue = {
                cursor: '1',
                fingerprint: fixedFingerprint,
            };
            const token = service['encodeCursor'](value);

            expect(service['decodeCursor'](token)).toEqual(value);
        });
    });

    describe('resolveOrderBy', () => {
        it('falls back to the default order when none is sent', () => {
            expect(service['resolveOrderBy'](undefined)).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('falls back to the default order when an empty list is sent', () => {
            expect(service['resolveOrderBy']([])).toEqual([
                ...PaginationDefaultOrderBy,
            ]);
        });

        it('returns an explicit order unchanged', () => {
            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            expect(service['resolveOrderBy'](orderBy)).toBe(orderBy);
        });
    });

    describe('resolveCursorOrderBy', () => {
        it('returns the order unchanged when it already carries the cursor field', () => {
            const orderBy: IPaginationOrderBy[] = [
                { id: EnumPaginationOrderDirectionType.asc },
            ];

            expect(service['resolveCursorOrderBy'](orderBy, 'id')).toBe(
                orderBy
            );
        });

        it('appends the cursor field as a tiebreaker using the last term direction', () => {
            const orderBy: IPaginationOrderBy[] = [
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            expect(service['resolveCursorOrderBy'](orderBy, 'id')).toEqual([
                { name: EnumPaginationOrderDirectionType.asc },
                { id: EnumPaginationOrderDirectionType.asc },
            ]);
        });
    });
});
