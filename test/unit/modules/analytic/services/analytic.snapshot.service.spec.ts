import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import type {
    AnalyticSnapshot,
    AnalyticSnapshotItem,
} from '@generated/prisma-client/client';
import { AnalyticCountRanges } from '@modules/analytic/constants/analytic.constant';
import { AnalyticSnapshotRepository } from '@modules/analytic/repositories/analytic.snapshot.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import {
    buildSnapshotResult,
    buildSnapshotItem,
} from '@test/unit/helpers/test.unit.analytic-snapshot.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
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

        it('deletes its own items when a later run already wrote the header', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);

            await service.replace(signal, buildSnapshotResult(1));

            expect(analyticSnapshotRepository.findHeader).toHaveBeenCalledWith(
                signal
            );
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).toHaveBeenCalledWith(signal, runId);
            expect(
                analyticSnapshotRepository.createHeader
            ).not.toHaveBeenCalled();
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).not.toHaveBeenCalled();
        });

        it('creates the header when none exists and deletes older items', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);

            await service.replace(signal, buildSnapshotResult(1));

            expect(
                analyticSnapshotRepository.createHeader
            ).toHaveBeenCalledWith(
                signal,
                expect.objectContaining({ runId, startedAt, count: 1 })
            );
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).toHaveBeenCalledWith(signal, startedAt);
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
        });

        it('counts a unique collision on the header create as a lost write', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);
            analyticSnapshotRepository.createHeader.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'signal')
            );

            await service.replace(signal, buildSnapshotResult(1));

            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).toHaveBeenCalledWith(signal, runId);
            expect(
                analyticSnapshotRepository.deleteItemsStartedBefore
            ).not.toHaveBeenCalled();
        });

        it('wraps any other header create failure', async () => {
            analyticSnapshotRepository.updateHeaderIfOlder.mockResolvedValue(
                false
            );
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);
            analyticSnapshotRepository.createHeader.mockRejectedValue(
                new Error('down')
            );

            await expect(
                service.replace(signal, buildSnapshotResult(1))
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
            expect(
                analyticSnapshotRepository.deleteItemsOfRun
            ).not.toHaveBeenCalled();
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
        it('answers an empty page from the params when no header exists', async () => {
            const emptyPage: IPaginationOffsetReturn<unknown> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 3,
                totalPage: 0,
                hasNext: false,
                hasPrevious: true,
                previousPage: 2,
                data: [],
            };
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);

            const result = await service.getListOffset(
                signal,
                params,
                null,
                itemSchema
            );

            expect(result).toEqual(emptyPage);
            expect(result).not.toHaveProperty('metadata');
            expect(
                analyticSnapshotRepository.findWithPaginationOffset
            ).not.toHaveBeenCalled();
        });

        it('pages the header run and answers parsed items with computedAt', async () => {
            const page: IResponsePaginationReturn<AnalyticSnapshotItem> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 3,
                totalPage: 3,
                hasNext: false,
                hasPrevious: true,
                previousPage: 2,
                data: [
                    buildSnapshotItem({
                        userId: 'user-1',
                        loginAt: '2026-01-01T00:00:00.000Z',
                    }),
                ],
            };
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);
            analyticSnapshotRepository.findWithPaginationOffset.mockResolvedValue(
                page
            );

            const result = await service.getListOffset(
                signal,
                params,
                { value: { gte: 10 } },
                itemSchema
            );

            expect(
                analyticSnapshotRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(signal, header.runId, params, {
                value: { gte: 10 },
            });
            expect(result).toEqual({
                ...page,
                data: [{ userId: 'user-1', loginAt: startedAt }],
                metadata: { computedAt },
            });
            expect(result.data[0]?.loginAt).toBeInstanceOf(Date);
        });

        it('passes a null value filter through', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);
            analyticSnapshotRepository.findWithPaginationOffset.mockResolvedValue(
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 3,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: true,
                    data: [],
                }
            );

            await service.getListOffset(signal, params, null, itemSchema);

            expect(
                analyticSnapshotRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(signal, header.runId, params, null);
        });
    });

    describe('getBuckets', () => {
        const bucketSchema = z.object({ key: z.string(), count: z.number() });

        it('reads the stored buckets ascending by value and answers computedAt', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);
            analyticSnapshotRepository.findWithPaginationOffset.mockResolvedValue(
                {
                    type: EnumPaginationType.offset,
                    count: 1,
                    perPage: AnalyticCountRanges.length,
                    page: 1,
                    totalPage: 1,
                    hasNext: false,
                    hasPrevious: false,
                    data: [buildSnapshotItem({ key: '1', count: 2 })],
                }
            );

            const result = await service.getBuckets(signal, bucketSchema);

            expect(result).toEqual({
                buckets: [{ key: '1', count: 2 }],
                computedAt,
            });
            expect(
                analyticSnapshotRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(
                signal,
                header.runId,
                {
                    skip: 0,
                    limit: AnalyticCountRanges.length,
                    orderBy: [{ value: EnumPaginationOrderDirectionType.asc }],
                },
                null
            );
        });

        it('answers no buckets and a null computedAt when no header exists', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);

            const result = await service.getBuckets(signal, bucketSchema);

            expect(result).toEqual({ buckets: [], computedAt: null });
        });
    });

    describe('getOneByKey', () => {
        it('answers a null item and a null computedAt when no header exists', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(null);

            await expect(
                service.getOneByKey(signal, 'user-1', itemSchema)
            ).resolves.toEqual({ item: null, computedAt: null });
            expect(
                analyticSnapshotRepository.findItemByKey
            ).not.toHaveBeenCalled();
        });

        it('answers a null item with the header computedAt when the run holds no item for the key', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);
            analyticSnapshotRepository.findItemByKey.mockResolvedValue(null);

            await expect(
                service.getOneByKey(signal, 'user-1', itemSchema)
            ).resolves.toEqual({ item: null, computedAt });
            expect(analyticSnapshotRepository.findHeader).toHaveBeenCalledTimes(
                1
            );
            expect(
                analyticSnapshotRepository.findItemByKey
            ).toHaveBeenCalledWith(signal, header.runId, 'user-1');
        });

        it('answers the parsed item with computedAt', async () => {
            analyticSnapshotRepository.findHeader.mockResolvedValue(header);
            analyticSnapshotRepository.findItemByKey.mockResolvedValue(
                buildSnapshotItem({
                    userId: 'user-1',
                    loginAt: '2026-01-01T00:00:00.000Z',
                })
            );

            await expect(
                service.getOneByKey(signal, 'user-1', itemSchema)
            ).resolves.toEqual({
                item: { userId: 'user-1', loginAt: startedAt },
                computedAt,
            });
        });
    });
});
