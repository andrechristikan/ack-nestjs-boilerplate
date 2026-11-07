import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationPushWorkspaceService } from '@modules/notification/services/notification.push.workspace.service';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushQueuePayload,
    INotificationPushStepResult,
    INotificationSendPushEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { NotificationPushProcessWorkspaceJoinAcceptedUseCase } from '@modules/notification/use-cases/notification.push.process-workspace-join-accepted.use-case';

describe('NotificationPushProcessWorkspaceJoinAcceptedUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationPushWorkspaceService: MockProxy<NotificationPushWorkspaceService> =
        mock<NotificationPushWorkspaceService>();
    let useCase: NotificationPushProcessWorkspaceJoinAcceptedUseCase;

    const send: INotificationSendPushEncryptedPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedNotificationTokens: ['cipher(token-1)'],
        username: 'nadia',
    };
    const progress = [
        EnumNotificationStep.updateProcessAt,
        EnumNotificationStep.sendMulticast,
    ];
    const completed: INotificationPushStepResult = {
        message: 'm',
        completedSteps: [
            ...progress,
            EnumNotificationStep.cleanupTokens,
            EnumNotificationStep.updateSentAt,
        ],
        failedSteps: [],
        encryptedFailureTokens: ['bad'],
        encryptedPendingTokens: [],
    };
    const failedRawError = new Error('redis');
    const failed: INotificationPushStepResult = {
        message: 'm',
        completedSteps: progress,
        failedSteps: [
            {
                step: EnumNotificationStep.cleanupTokens,
                rawError: failedRawError,
            },
        ],
        encryptedFailureTokens: ['bad'],
        encryptedPendingTokens: [],
    };
    const outageRawError = new Error(
        'notification.queue.push.error.tokensPending'
    );
    const outage: INotificationPushStepResult = {
        message: 'm',
        completedSteps: [EnumNotificationStep.updateProcessAt],
        failedSteps: [
            {
                step: EnumNotificationStep.sendMulticast,
                rawError: outageRawError,
            },
        ],
        encryptedFailureTokens: [],
        encryptedPendingTokens: ['t1', 't2'],
    };
    const pending = ['t1', 't2'];

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number | string> = {
                'notification.push.staleTokenThresholdInMs': 86_400_000,
                'app.encryptionSecretKey': 'secret-key',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                NotificationPushProcessWorkspaceJoinAcceptedUseCase,
                NotificationUtil,
                {
                    provide: NotificationPushWorkspaceService,
                    useValue: notificationPushWorkspaceService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationPushProcessWorkspaceJoinAcceptedUseCase
        );
    });

    describe('execute', () => {
        const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };
        const jobData = {
            send,
            data,
            completedSteps: [EnumNotificationStep.updateProcessAt],
            encryptedFailureTokens: null,
            encryptedPendingTokens: pending,
        };

        it('records progress and the failed tokens, then returns the step response when every step succeeded', async () => {
            notificationPushWorkspaceService.processWorkspaceJoinAccepted.mockResolvedValue(
                completed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            const result = await useCase.execute(job);

            expect(
                notificationPushWorkspaceService.processWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null,
                pending
            );
            expect(job.updateData).toHaveBeenCalledTimes(1);
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: completed.completedSteps,
                encryptedFailureTokens: ['bad'],
                encryptedPendingTokens: [],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: completed.completedSteps,
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationPushWorkspaceService.processWorkspaceJoinAccepted.mockResolvedValue(
                failed
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(useCase.execute(job)).rejects.toMatchObject({
                isFatal: true,
                message: 'notification.queue.error.stepsFailed',
                rawError: failedRawError,
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: progress,
                encryptedFailureTokens: ['bad'],
                encryptedPendingTokens: [],
            });
        });

        it('records the pending tokens then throws a fatal QueueException on a total outage', async () => {
            notificationPushWorkspaceService.processWorkspaceJoinAccepted.mockResolvedValue(
                outage
            );
            const job = buildQueueJob<
                INotificationPushQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationPushProcess
            >(jobData);

            await expect(useCase.execute(job)).rejects.toMatchObject({
                isFatal: true,
                message: 'notification.queue.error.stepsFailed',
                rawError: outageRawError,
            });
            expect(job.updateData).toHaveBeenCalledWith({
                ...job.data,
                completedSteps: outage.completedSteps,
                encryptedFailureTokens: [],
                encryptedPendingTokens: pending,
            });
        });
    });
});
