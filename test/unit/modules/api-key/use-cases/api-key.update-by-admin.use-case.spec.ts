import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUpdateByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-by-admin.use-case';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ApiKeyUpdateByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const metadata = { apiKeyId: apiKey.id };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-actor', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const effect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: ApiKeyUpdateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyUpdateByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyUpdateByAdminUseCase);
    });

    describe('execute', () => {
        const updated: ApiKey = { ...apiKey, name: 'Renamed' };

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
            expect(apiKeyService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
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

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminApiKeyUpdate,
                    metadata,
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
