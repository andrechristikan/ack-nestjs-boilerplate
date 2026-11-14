import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKey } from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyCreateByAdminUseCase } from '@modules/api-key/use-cases/api-key.create-by-admin.use-case';
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

describe('ApiKeyCreateByAdminUseCase', () => {
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

    let useCase: ApiKeyCreateByAdminUseCase;

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
                ApiKeyCreateByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyCreateByAdminUseCase);
    });

    describe('execute', () => {
        const body: ApiKeyCreateRequestDto = {
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
        };
        const created = { ...apiKey, secret: 'plain-secret' };

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyService.createByAdminInTx.mockResolvedValue({
                apiKey,
                secret: 'plain-secret',
            });
            apiKeyUtil.mapCreate.mockReturnValue(created);
        });

        it('creates the api key on the outbox transaction and shapes the secret-bearing response', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({ data: created });
            expect(apiKeyService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: null,
                    endAt: null,
                }
            );
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'plain-secret'
            );
        });

        it('adds only the create activity entry with the drawn id and the passed context on the same tx', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: apiKey.id,
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                },
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminApiKeyCreate,
                    metadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('passes the date window through', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');

            await useCase.execute(requestContext, apiKeyContext, authContext, {
                ...body,
                startAt,
                endAt,
            });

            expect(apiKeyService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                expect.objectContaining({ startAt, endAt })
            );
        });
    });
});
