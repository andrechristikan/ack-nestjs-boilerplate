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
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
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
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

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
    const preparedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminTermPolicyCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let useCase: TermPolicyResendEmailByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        helperDateService.formatToIso.mockImplementation((date: Date) =>
            date.toISOString()
        );
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyResendEmailByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(TermPolicyResendEmailByAdminUseCase);
    });

    describe('execute', () => {
        it('enqueues the resend for a published policy, then stages the activity log once', async () => {
            const calls: string[] = [];
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            notificationQueue.sendResendPublishTermPolicy.mockImplementation(
                async () => {
                    calls.push('enqueue');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await useCase.execute('term-policy-1', 'user-1');

            expect(result).toEqual({});
            expect(calls).toEqual(['enqueue', 'stage']);
            expect(
                notificationQueue.sendResendPublishTermPolicy
            ).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: publishedAt.toISOString(),
                },
                'user-1'
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyResendEmail,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('lets an enqueue failure propagate unchanged and stages nothing', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const cause = new Error('redis down');
            notificationQueue.sendResendPublishTermPolicy.mockRejectedValue(
                cause
            );

            await expect(
                useCase.execute('term-policy-1', 'user-1')
            ).rejects.toBe(cause);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised by the enqueue unchanged without staging', async () => {
            termPolicyService.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const error = new TermPolicyNotFoundException();
            notificationQueue.sendResendPublishTermPolicy.mockRejectedValue(
                error
            );

            await expect(
                useCase.execute('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('enqueues nothing when the term policy is not published', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyService.getPublishedByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(
                notificationQueue.sendResendPublishTermPolicy
            ).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
