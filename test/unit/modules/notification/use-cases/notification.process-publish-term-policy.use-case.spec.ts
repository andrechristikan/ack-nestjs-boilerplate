import { Test } from '@nestjs/testing';
import {
    buildTermPolicyCursorPage as cursorPage,
    buildTermPolicyPage,
} from '@test/unit/helpers/test.unit.notification-term-policy.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserService } from '@modules/user/services/user.service';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationBulkQueuePayload } from '@modules/notification/interfaces/notification.interface';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import { NotificationProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-publish-term-policy.use-case';

describe('NotificationProcessPublishTermPolicyUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationTermPolicyService: MockProxy<NotificationTermPolicyService> =
        mock<NotificationTermPolicyService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: NotificationProcessPublishTermPolicyUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationProcessPublishTermPolicyUseCase,
                {
                    provide: NotificationTermPolicyService,
                    useValue: notificationTermPolicyService,
                },
                { provide: UserService, useValue: userService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(NotificationProcessPublishTermPolicyUseCase);
    });
    describe('execute', () => {
        const data = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 2,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
            resendNonce: null,
        };
        const cutoff = new Date('2024-01-01T00:00:00.000Z');
        const u1 = { id: 'u1', email: 'u1@example.com', username: 'u1' };
        const u2 = { id: 'u2', email: 'u2@example.com', username: 'u2' };
        const u3 = { id: 'u3', email: 'u3@example.com', username: 'u3' };
        const u4 = { id: 'u4', email: 'u4@example.com', username: 'u4' };
        const job = buildQueueJob<
            INotificationBulkQueuePayload<typeof data>,
            unknown,
            EnumNotificationProcess
        >({ proceedBy: 'admin-id', data });

        beforeEach(() => {
            helperDateService.createFromIso.mockReturnValue(cutoff);
            Object.defineProperty(
                notificationTermPolicyService,
                'emailBatchSize',
                { value: 3 }
            );
        });

        it('pages the active users at the cutoff and sends each page as batches, advancing the batch index', async () => {
            userService.getListActiveRecipientCursor
                .mockResolvedValueOnce(cursorPage([u1, u2, u3], true))
                .mockResolvedValueOnce(cursorPage([u4], false));
            const firstPage = buildTermPolicyPage([u1, u2, u3]);
            const secondPage = buildTermPolicyPage([u4]);
            notificationTermPolicyService.getPage
                .mockResolvedValueOnce(firstPage)
                .mockResolvedValueOnce(secondPage);
            notificationTermPolicyService.sendFreshBatch.mockResolvedValue(1);

            const result = await useCase.execute(job);

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                data.recipientCutoffAt
            );
            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(1, null, 3, cutoff);
            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'cursor-after-u3', 3, cutoff);
            expect(
                userService.getManyActiveRecipientsByIds
            ).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyService.getPage
            ).toHaveBeenNthCalledWith(1, data.termPolicyId, [u1, u2, u3]);
            expect(
                notificationTermPolicyService.sendFreshBatch
            ).toHaveBeenNthCalledWith(
                1,
                'admin-id',
                data,
                firstPage.freshUsers,
                0
            );
            expect(
                notificationTermPolicyService.sendFreshBatch
            ).toHaveBeenNthCalledWith(
                2,
                'admin-id',
                data,
                secondPage.freshUsers,
                1
            );
            expect(
                notificationTermPolicyService.getPending
            ).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyService.sendPendingBatches
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 4,
                createdCounts: 4,
                batches: 2,
            });
        });

        it('fetches the active users off the page that a pending batch names before sending them', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            const page = buildTermPolicyPage([u1], [], ['B']);
            const pending = { sendableMarkers: [], offPageUserIds: ['u4'] };
            notificationTermPolicyService.getPage.mockResolvedValue(page);
            notificationTermPolicyService.getPending.mockResolvedValue(pending);
            userService.getManyActiveRecipientsByIds.mockResolvedValue([u4]);
            notificationTermPolicyService.sendPendingBatches.mockResolvedValue(
                1
            );
            notificationTermPolicyService.sendFreshBatch.mockResolvedValue(0);

            const result = await useCase.execute(job);

            expect(
                notificationTermPolicyService.getPending
            ).toHaveBeenCalledWith(data.termPolicyId, page);
            expect(
                userService.getManyActiveRecipientsByIds
            ).toHaveBeenCalledWith(['u4'], cutoff);
            expect(
                notificationTermPolicyService.sendPendingBatches
            ).toHaveBeenCalledWith('admin-id', data, page, pending, [u4], 0);
            expect(result).toMatchObject({
                candidateCounts: 1,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('creates the fresh batch while the pending batches read their markers and users, numbering it after them', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1, u2], false)
            );
            const page = buildTermPolicyPage([u1, u2], [u2], ['B1', 'B2']);
            notificationTermPolicyService.getPage.mockResolvedValue(page);
            const deferredPending = buildDeferred<{
                sendableMarkers: [];
                offPageUserIds: [];
            }>();
            notificationTermPolicyService.getPending.mockReturnValue(
                deferredPending.promise
            );
            notificationTermPolicyService.sendFreshBatch.mockImplementation(
                async () => {
                    deferredPending.resolve({
                        sendableMarkers: [],
                        offPageUserIds: [],
                    });

                    return 1;
                }
            );
            notificationTermPolicyService.sendPendingBatches.mockResolvedValue(
                2
            );

            const result = await useCase.execute(job);

            expect(
                notificationTermPolicyService.sendFreshBatch
            ).toHaveBeenCalledWith('admin-id', data, [u2], 2);
            expect(result).toMatchObject({ createdCounts: 1, batches: 3 });
        });

        it('advances the cursor past a full page that sends nothing', async () => {
            userService.getListActiveRecipientCursor
                .mockResolvedValueOnce(cursorPage([u1, u2, u3], true))
                .mockResolvedValueOnce(cursorPage([u4], false));
            notificationTermPolicyService.getPage
                .mockResolvedValueOnce(buildTermPolicyPage([u1, u2, u3], []))
                .mockResolvedValueOnce(buildTermPolicyPage([u4], []));
            notificationTermPolicyService.sendFreshBatch.mockResolvedValue(0);

            const result = await useCase.execute(job);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'cursor-after-u3', 3, cutoff);
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 4,
                createdCounts: 0,
                batches: 0,
            });
        });

        it('stops after a full page that has no next page', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1, u2, u3], false)
            );
            notificationTermPolicyService.getPage.mockResolvedValue(
                buildTermPolicyPage([u1, u2, u3])
            );
            notificationTermPolicyService.sendFreshBatch.mockResolvedValue(1);

            const result = await useCase.execute(job);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({ candidateCounts: 3, batches: 1 });
        });

        it('stops after a page shorter than the batch size', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            notificationTermPolicyService.getPage.mockResolvedValue(
                buildTermPolicyPage([u1])
            );
            notificationTermPolicyService.sendFreshBatch.mockResolvedValue(1);

            await useCase.execute(job);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenCalledTimes(1);
        });

        it('reads and sends nothing when there is no candidate', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([], false)
            );

            const result = await useCase.execute(job);

            expect(
                notificationTermPolicyService.getPage
            ).not.toHaveBeenCalled();
            expect(
                notificationTermPolicyService.sendFreshBatch
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.publishTermPolicy',
                candidateCounts: 0,
                createdCounts: 0,
                batches: 0,
            });
        });
    });
});
