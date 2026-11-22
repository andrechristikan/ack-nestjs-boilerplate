import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ITermPolicyPublishEffect } from '@modules/term-policy/interfaces/term-policy.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
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
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyResendEmailByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.resend-email-by-admin.use-case';

describe('TermPolicyResendEmailByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: ITermPolicy = {
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
    const publishedTermPolicy: ITermPolicy = {
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

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        helperDateService.formatToIso.mockImplementation((date: Date) =>
            date.toISOString()
        );
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        termPolicyService.resendPublishEffect.mockReturnValue(resendEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyResendEmailByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(TermPolicyResendEmailByAdminUseCase);
    });

    describe('execute', () => {
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
            expect(termPolicyService.resendPublishEffect).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: publishedAt.toISOString(),
                },
                'user-1'
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                publishedTermPolicy,
                timestamp
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyResendEmail,
                    metadata,
                }
            );
            expect(outboxService.addMany).toHaveBeenCalledTimes(1);
            expect(outboxService.addMany).toHaveBeenCalledWith([
                resendEffect,
                entryEffect,
            ]);
        });

        it('lets a failed insert propagate unchanged', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const cause = new Error('database down');
            outboxService.addMany.mockRejectedValue(cause);

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
            expect(outboxService.addMany).not.toHaveBeenCalled();
        });
    });
});
