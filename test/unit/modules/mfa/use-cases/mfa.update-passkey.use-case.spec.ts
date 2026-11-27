import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaUpdatePasskeyUseCase } from '@modules/mfa/use-cases/mfa.update-passkey.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('MfaUpdatePasskeyUseCase', () => {
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: MfaUpdatePasskeyUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('user-quartz');
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaUpdatePasskeyUseCase,
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(MfaUpdatePasskeyUseCase);
    });

    describe('execute', () => {
        it('renames the passkey of the caller and adds the entry on one tx, asking no re-authentication', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'passkey-one',
                    { name: 'Laptop' }
                )
            ).resolves.toEqual({});

            expect(mfaPasskeyService.updateNameInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'passkey-one',
                'Laptop'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.userMfaPasskeyUpdated }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('adds no entry when the passkey is not the caller', async () => {
            const failure = new MfaPasskeyNotFoundException();
            mfaPasskeyService.updateNameInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'passkey-other',
                    { name: 'Laptop' }
                )
            ).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
