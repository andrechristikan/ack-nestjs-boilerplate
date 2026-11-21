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
import { ApiKeyResetByAdminUseCase } from '@modules/api-key/use-cases/api-key.reset-by-admin.use-case';
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

describe('ApiKeyResetByAdminUseCase', () => {
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

    let useCase: ApiKeyResetByAdminUseCase;

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
                ApiKeyResetByAdminUseCase,
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

        useCase = module.get(ApiKeyResetByAdminUseCase);
    });

    describe('execute', () => {
        const reset = { ...apiKey, secret: 'new-secret' };

        it('resets the secret on the outbox transaction and shapes the secret-bearing response', async () => {
            apiKeyService.resetByAdminInTx.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id
            );

            expect(result).toEqual({ data: reset });
            expect(apiKeyService.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id
            );
        });

        it('adds the reset activity entry from the reset key and the passed context on the same tx', async () => {
            apiKeyService.resetByAdminInTx.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                apiKey.id
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminApiKeyReset,
                    metadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('rethrows a typed exception of the write and adds no entry', async () => {
            const failure = new ApiKeyInactiveException();
            apiKeyService.resetByAdminInTx.mockRejectedValue(failure);

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

        it('maps a write conflict to ApiKeyInactiveException', async () => {
            apiKeyService.resetByAdminInTx.mockRejectedValue(
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
                    apiKey.id
                )
            ).rejects.toBeInstanceOf(ApiKeyInactiveException);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            apiKeyService.resetByAdminInTx.mockRejectedValue(cause);

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
