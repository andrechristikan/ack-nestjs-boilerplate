import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUpdateByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-by-admin.use-case';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    buildApiKey,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ApiKeyUpdateByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const apiKey: ApiKey = buildApiKey();
    const metadata = {
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        apiKeyType: apiKey.type,
        timestamp: now,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-actor', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: ApiKeyUpdateByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(effect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyUpdateByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ApiKeyUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(ApiKeyUpdateByAdminUseCase);
    });

    describe('execute', () => {
        const updated: ApiKey = { ...apiKey, name: 'Renamed' };

        beforeEach(() => {
            apiKeyService.getOneById.mockResolvedValue(apiKey);
        });

        it('throws ApiKeyNotFoundException from getOneById and opens no transaction', async () => {
            const failure = new ApiKeyNotFoundException();
            apiKeyService.getOneById.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { name: 'Renamed' }
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws ApiKeyInactiveException from assertActive and opens no transaction', async () => {
            const failure = new ApiKeyInactiveException();
            apiKeyService.assertActive.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { name: 'Renamed' }
                )
            ).rejects.toBe(failure);
            expect(apiKeyService.assertActive).toHaveBeenCalledWith(apiKey);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('renames the key on the outbox transaction and wraps the result', async () => {
            apiKeyService.updateByAdminInTx.mockResolvedValue(updated);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id,
                {
                    name: 'Renamed',
                }
            );

            expect(result).toEqual({ data: updated });
            expect(apiKeyService.getOneById).toHaveBeenCalledWith(apiKey.id);
            expect(apiKeyService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey,
                'Renamed'
            );
        });

        it('adds the update activity entry from the updated key and the passed context on the same tx', async () => {
            apiKeyService.updateByAdminInTx.mockResolvedValue(updated);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id,
                { name: 'Renamed' }
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.adminApiKeyUpdated,
                    metadata: { ...metadata, apiKeyName: 'Renamed' },
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('rethrows a failure of the write and adds no entry', async () => {
            const failure = new ApiKeyNotFoundException();
            apiKeyService.updateByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { name: 'Renamed' }
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
