import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { ApiKeyDeleteByAdminUseCase } from '@modules/api-key/use-cases/api-key.delete-by-admin.use-case';
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

describe('ApiKeyDeleteByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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

    let useCase: ApiKeyDeleteByAdminUseCase;

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
                ApiKeyDeleteByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('deletes the api key on the outbox transaction and wraps the result', async () => {
            apiKeyService.deleteByAdminInTx.mockResolvedValue(apiKey);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id
            );

            expect(result).toEqual({ data: apiKey });
            expect(apiKeyService.deleteByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id
            );
        });

        it('adds the delete activity entry from the deleted key and the passed context on the same tx', async () => {
            apiKeyService.deleteByAdminInTx.mockResolvedValue(apiKey);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id
            );

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminApiKeyDelete,
                    metadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('rethrows a typed exception of the write and adds no entry', async () => {
            const failure = new ApiKeyNotFoundException();
            apiKeyService.deleteByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to ApiKeyNotFoundException', async () => {
            apiKeyService.deleteByAdminInTx.mockRejectedValue(
                new Error('conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id
                )
            ).rejects.toBeInstanceOf(ApiKeyNotFoundException);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            apiKeyService.deleteByAdminInTx.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
