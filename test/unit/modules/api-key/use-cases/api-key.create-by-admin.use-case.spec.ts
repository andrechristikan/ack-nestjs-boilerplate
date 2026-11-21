import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
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
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyCreateByAdminUseCase } from '@modules/api-key/use-cases/api-key.create-by-admin.use-case';
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

describe('ApiKeyCreateByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const apiKey: ApiKey = {
        ...buildApiKey(),
        name: 'Acme Api Key',
    };
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

    let useCase: ApiKeyCreateByAdminUseCase;
    let databaseUtil: DatabaseUtil;

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
                ApiKeyCreateByAdminUseCase,
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

        useCase = module.get(ApiKeyCreateByAdminUseCase);
        databaseUtil = module.get(DatabaseUtil);
    });

    describe('execute', () => {
        const body: ApiKeyCreateRequestDto = {
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
        };
        const created = { ...apiKey, secret: 'plain-secret' };

        beforeEach(() => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(apiKey.id);
            apiKeyService.createByAdminInTx.mockResolvedValue({
                apiKey,
                secret: 'plain-secret',
            });
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
        });

        it('adds only the create activity entry with the drawn id and the passed context on the same tx', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
