import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ITermPolicyPublishEffect } from '@modules/term-policy/interfaces/term-policy.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyResendEmailByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.resend-email-by-admin.use-case';

describe('TermPolicyResendEmailByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyQueue: MockProxy<TermPolicyQueue> = mock<TermPolicyQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };
    const publishedAt = new Date('2026-01-02T00:00:00.000Z');
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');
    const publishedTermPolicy: TermPolicy = {
        ...termPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt,
        updatedAt,
    };
    const metadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    const resendEffect: ITermPolicyPublishEffect = {
        queue: EnumTermPolicyQueue.termPolicy,
        name: EnumTermPolicyProcess.publish,
        data: {
            proceedBy: 'user-1',
            data: {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
                recipientCutoffAt: publishedAt.toISOString(),
                resendNonce: 'nonce-1',
            },
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'publish-term-policy-1-nonce-1',
    };

    let useCase: TermPolicyResendEmailByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(timestamp);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        termPolicyQueue.resendPublishEffect.mockReturnValue(resendEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyResendEmailByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyQueue, useValue: termPolicyQueue },
                TermPolicyUtil,
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyResendEmailByAdminUseCase);
    });

    describe('execute', () => {
        it('answers AwsSesNotConfiguredException before any read, write, or transaction when SES is unset', async () => {
            termPolicyService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                termPolicyService.getPublishedByAdmin
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds the resend row and the activity entry in one addMany for a published policy', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(result).toEqual({});
            expect(termPolicyQueue.resendPublishEffect).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: publishedAt.toISOString(),
                },
                'user-1'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyEmailResent,
                    metadata,
                }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                resendEffect,
                entryEffect,
            ]);
        });

        it('builds the activity entry inside the transaction, after the resend effect', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(databaseService.withTransaction).toHaveBeenCalledBefore(
                activityLogQueue.recordEffect
            );
        });

        it('lets a failed insert propagate unchanged', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const cause = new Error('database down');
            outboxService.addManyInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBe(cause);
        });

        it('adds nothing when the term policy is not published', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyService.getPublishedByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBe(error);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
