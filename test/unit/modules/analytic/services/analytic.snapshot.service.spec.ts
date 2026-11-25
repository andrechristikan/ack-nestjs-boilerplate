import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import type { AnalyticSnapshot, Prisma } from '@generated/prisma-client/client';
import { AnalyticSnapshotRepository } from '@modules/analytic/repositories/analytic.snapshot.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { buildSnapshotResult } from '@test/unit/helpers/test.unit.analytic-snapshot.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AnalyticSnapshotService', () => {
    const signal = EnumAnalyticSnapshotSignal.impossibleTravel;
    const runId = '66a000000000000000000001';
    const startedAt = new Date('2026-01-01T00:00:00.000Z');
    const computedAt = new Date('2026-01-01T00:00:05.000Z');
    const windowStart = new Date('2025-12-02T00:00:00.000Z');
    const windowEnd = new Date('2026-01-01T00:00:00.000Z');
    const params: IPaginationQueryOffsetParams = {
        orderBy: [],
        limit: 20,
        skip: 40,
    };
    const header: AnalyticSnapshot = {
        id: '66a000000000000000000010',
        signal,
        runId: 'stored-run',
        startedAt: new Date('2025-12-31T23:45:00.000Z'),
        count: 2,
        metadata: { total: 2 },
        windowStart,
        windowEnd,
        computedAt,
        createdAt: startedAt,
        createdBy: null,
        updatedAt: startedAt,
        updatedBy: null,
    };
    const itemSchema = z.object({
        userId: z.string(),
        loginAt: z.coerce.date(),
    });
    const metadataSchema = z.object({ total: z.number() });

    const analyticSnapshotRepository: MockProxy<AnalyticSnapshotRepository> =
        mock<AnalyticSnapshotRepository>();

    let service: AnalyticSnapshotService;
    let databaseUtil: DatabaseUtil;
    let calls: string[];

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(startedAt);
        calls = [];

        analyticSnapshotRepository.createItems.mockImplementation(async () => {
            calls.push('createItems');
            vi.setSystemTime(computedAt);
        });
        analyticSnapshotRepository.updateHeaderIfOlder.mockImplementation(
            async () => {
                calls.push('updateHeaderIfOlder');

                return true;
            }
        );
        analyticSnapshotRepository.createHeader.mockImplementation(async () => {
            calls.push('createHeader');

            return true;
        });
        analyticSnapshotRepository.deleteItemsStartedBefore.mockImplementation(
            async () => {
                calls.push('deleteItemsStartedBefore');
            }
        );
        analyticSnapshotRepository.deleteItemsOfRun.mockImplementation(
            async () => {
                calls.push('deleteItemsOfRun');
            }
        );

        const module = await Test.createTestingModule({
            providers: [
                AnalyticSnapshotService,
                {
                    provide: AnalyticSnapshotRepository,
                    useValue: analyticSnapshotRepository,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'analytic.snapshot.writeBatchSize': 1000,
                    }),
                },
            ],
        }).compile();

        service = module.get(AnalyticSnapshotService);
        databaseUtil = module.get(DatabaseUtil);
        vi.spyOn(databaseUtil, 'createId').mockReturnValue(runId);
    });

    describe('replace', () => {
        it('inserts items in batches, writes the header, then deletes older items', async () => {
            const result = buildSnapshotResult(2500);

            await service.replace(signal, result);

            expect(calls).toEqual([
                'createItems',
                'createItems',
                'createItems',
                'updateHeaderIfOlder',
                'deleteItemsStartedBefore',
            ]);
            expect(
                analyticSnapshotRepository.createItems
            ).toHaveBeenNthCalledWith(
                1,
                signal,
                runId,
                startedAt,
                result.items.slice(0, 1000)
            );
            expect(
                analyticSnapshotRepository.createItems
            ).toHaveBeenNthCalledWith(
                2,
                signal,
                runId,
                startedAt,
                result.items.slice(1000, 2000)
            );
            expect(
                analyticSnapshotRepository.createItems
            ).toHaveBeenNthCalledWith(
                3,
                signal,
                runId,
                startedAt,
                result.items.slice(2000)
            );
            expect(
                analyticSnapshotRepository.updateHeaderIfOlder
            ).toHaveBeenCalledWith(signal, {
                runId,
                startedAt,
                count: 2500,
                metadata: { total: 2500 },
                windowStart,
                windowEnd,
                computedAt,
            });
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).toHaveBeenCalledWith(signal, startedAt);
            expect(
                analyticSnapshotRepository.createHeader
            ).not.toHaveBeenCalled();
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });

        it('inserts no batch for an empty result and still writes the header', async () => {
            await service.replace(signal, buildSnapshotResult(0));

            expect(calls).toEqual([
                'updateHeaderIfOlder',
                'deleteItemsStartedBefore',
            ]);
        });

        it('deletes its own items when the header create reports a lost write', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.createHeader.mockResolvedValue(false);

            await service.replace(signal, buildSnapshotResult(1));

            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).toHaveBeenCalledWith(signal, runId);
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).not.toHaveBeenCalled();
        });

        it('creates the header with no header read after a missed update and deletes older items', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );

            await service.replace(signal, buildSnapshotResult(1));

            expect(
                analyticSnapshotRepository.createHeader
            ).toHaveBeenCalledWith(
                signal,
                expect.objectContaining({ runId, startedAt, count: 1 })
            );
            expect(
                analyticSnapshotRepository.findHeader
            ).not.toHaveBeenCalled();
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).toHaveBeenCalledWith(signal, startedAt);
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });

        it('passes an exception the header create rejects with through untouched', async () => {
            const error = new DatabaseUnavailableException();
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.createHeader.mockRejectedValue(error);

            await expect(
                service.replace(signal, buildSnapshotResult(1))
            ).rejects.toBe(error);
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });
    });

    describe('replaceHeader', () => {
        const metadata = { buckets: [{ key: '1', count: 2 }] };
        const result = {
            items: [],
            metadata,
            windowStart: null,
            windowEnd: null,
        };

        it('writes the header with count 0 and the metadata and touches no item', async () => {
            await service.replaceHeader(signal, result);

            expect(
                analyticSnapshotRepository.updateHeaderIfOlder
            ).toHaveBeenCalledWith(signal, {
                runId,
                startedAt,
                count: 0,
                metadata,
                windowStart: null,
                windowEnd: null,
                computedAt: startedAt,
            });
            expect(
                analyticSnapshotRepository.createItems
            ).not.toHaveBeenCalled();
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).not.toHaveBeenCalled();
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });

        it('creates the header with no header read after a missed update', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );

            await service.replaceHeader(signal, result);

            expect(
                analyticSnapshotRepository.createHeader
            ).toHaveBeenCalledWith(
                signal,
                expect.objectContaining({ runId, count: 0, metadata })
            );
            expect(
                analyticSnapshotRepository.findHeader
            ).not.toHaveBeenCalled();
        });

        it('treats a header create answering false as a lost write and deletes nothing', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.createHeader.mockResolvedValue(false);

            await expect(
                service.replaceHeader(signal, result)
            ).resolves.toBeUndefined();
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });

        it('passes an exception the header create rejects with through untouched', async () => {
            const error = new DatabaseUnavailableException();
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.createHeader.mockRejectedValue(error);

            await expect(service.replaceHeader(signal, result)).rejects.toBe(
                error
            );
        });
    });

    describe('getSummary', () => {
        it('answers the empty summary when no header exists', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);

            await expect(
                service.getSummary(signal, metadataSchema)
            ).resolves.toEqual({
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt: null,
            });
        });

        it('answers the header with its metadata parsed', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);

            await expect(
                service.getSummary(signal, metadataSchema)
            ).resolves.toEqual({
                count: 2,
                metadata: { total: 2 },
                windowStart,
                windowEnd,
                computedAt,
            });
        });

        it('answers a null metadata without parsing it', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue({
                ...header,
                metadata: null,
            });

            await expect(
                service.getSummary(signal, metadataSchema)
            ).resolves.toMatchObject({ count: 2, metadata: null });
        });
    });

    describe('getListOffset', () => {
        const page: IResponsePaginationReturn<Prisma.JsonValue> = {
            type: EnumPaginationType.offset,
            count: 1,
            perPage: 20,
            page: 3,
            totalPage: 3,
            hasNext: false,
            hasPrevious: true,
            previousPage: 2,
            data: [{ userId: 'user-1', loginAt: '2026-01-01T00:00:00.000Z' }],
            metadata: { computedAt },
        };

        it('reads the page once with the signal, params, and value filter and no header', async () => {
            analyticSnapshotRepository.findListOffset.mockResolvedValue(page);

            await service.getListOffset(
                signal,
                params,
                { value: { gte: 10 } },
                itemSchema
            );

            expect(
                analyticSnapshotRepository.findListOffset
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticSnapshotRepository.findListOffset
            ).toHaveBeenCalledWith(signal, params, { value: { gte: 10 } });
            expect(
                analyticSnapshotRepository.findHeader
            ).not.toHaveBeenCalled();
        });

        it('parses each element with the schema and keeps the metadata computedAt', async () => {
            analyticSnapshotRepository.findListOffset.mockResolvedValue(page);

            const result = await service.getListOffset(
                signal,
                params,
                null,
                itemSchema
            );

            expect(result).toEqual({
                ...page,
                data: [{ userId: 'user-1', loginAt: startedAt }],
                metadata: { computedAt },
            });
            expect(result.data[0]?.loginAt).toBeInstanceOf(Date);
            expect(
                analyticSnapshotRepository.findListOffset
            ).toHaveBeenCalledWith(signal, params, null);
        });

        it('keeps a page with no metadata without one', async () => {
            const { metadata: _metadata, ...emptyPage } = page;
            analyticSnapshotRepository.findListOffset.mockResolvedValue({
                ...emptyPage,
                count: 0,
                data: [],
            });

            const result = await service.getListOffset(
                signal,
                params,
                null,
                itemSchema
            );

            expect(result.data).toEqual([]);
            expect(result).not.toHaveProperty('metadata');
        });
    });

    describe('writeHeader', () => {
        it('answers false when the header create resolves false', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.createHeader.mockResolvedValue(false);

            const result = await service['writeHeader'](signal, {
                runId,
                startedAt,
                count: 0,
                metadata: null,
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            expect(result).toBe(false);
        });
    });
});
