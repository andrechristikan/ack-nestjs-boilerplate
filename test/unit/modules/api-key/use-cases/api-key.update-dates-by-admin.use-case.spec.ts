import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUpdateDatesByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-dates-by-admin.use-case';
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

describe('ApiKeyUpdateDatesByAdminUseCase', () => {
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

    let useCase: ApiKeyUpdateDatesByAdminUseCase;

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
                ApiKeyUpdateDatesByAdminUseCase,
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

        useCase = module.get(ApiKeyUpdateDatesByAdminUseCase);
    });

    describe('execute', () => {
        const startAt = new Date('2026-02-01T00:00:00.000Z');
        const endAt = new Date('2026-03-01T00:00:00.000Z');
        const updated: ApiKey = { ...apiKey, startAt, endAt };

        it('updates the date window on the outbox transaction and wraps the result', async () => {
            apiKeyService.updateDatesByAdminInTx.mockResolvedValue(updated);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id,
                {
                    startAt,
                    endAt,
                }
            );

            expect(result).toEqual({ data: updated });
            expect(apiKeyService.updateDatesByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                startAt,
                endAt
            );
        });

        it('adds the date activity entry from the updated key and the passed context on the same tx', async () => {
            apiKeyService.updateDatesByAdminInTx.mockResolvedValue(updated);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id,
                { startAt, endAt }
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminApiKeyUpdateDate,
                    metadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('rethrows a typed exception of the write and adds no entry', async () => {
            const failure = new ApiKeyInactiveException();
            apiKeyService.updateDatesByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { startAt, endAt }
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to ApiKeyInactiveException', async () => {
            apiKeyService.updateDatesByAdminInTx.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('conflict', {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                })
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { startAt, endAt }
                )
            ).rejects.toBeInstanceOf(ApiKeyInactiveException);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            apiKeyService.updateDatesByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    apiKey.id,
                    { startAt, endAt }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
