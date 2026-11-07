import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import {
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationQueuePayload,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import { NotificationProcessUserAcceptTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-user-accept-term-policy.use-case';

describe('NotificationProcessUserAcceptTermPolicyUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationTermPolicyService: MockProxy<NotificationTermPolicyService> =
        mock<NotificationTermPolicyService>();
    let useCase: NotificationProcessUserAcceptTermPolicyUseCase;

    const completed: INotificationStepResult = {
        message: 'm',
        completedSteps: [EnumNotificationStep.createNotification],
        failedSteps: [],
    };
    const failedRawError = new Error('redis');
    const failed: INotificationStepResult = {
        message: 'm',
        completedSteps: [EnumNotificationStep.createNotification],
        failedSteps: [
            {
                step: EnumNotificationStep.sendEmail,
                rawError: failedRawError,
            },
        ],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                NotificationProcessUserAcceptTermPolicyUseCase,
                NotificationUtil,
                {
                    provide: NotificationTermPolicyService,
                    useValue: notificationTermPolicyService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationProcessUserAcceptTermPolicyUseCase);
    });
    describe('execute', () => {
        const data: INotificationAcceptTermPolicyPayload = {
            type: EnumTermPolicyType.privacy,
            version: 2,
            termPolicyId: 'term-policy-id',
        };
        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            recipient: TestEncryptedRecipient,
            proceedBy: 'user-id',
            data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationTermPolicyService.processUserAcceptTermPolicy.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await useCase.execute(queueJob);

            expect(
                notificationTermPolicyService.processUserAcceptTermPolicy
            ).toHaveBeenCalledWith(
                'user-id',
                TestEncryptedRecipient,
                data,
                'n-1',
                []
            );
            expect(queueJob.updateData).toHaveBeenCalledTimes(1);
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
            expect(result).toEqual({
                message: 'm',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });

        it('records progress then throws a fatal QueueException when a step failed', async () => {
            notificationTermPolicyService.processUserAcceptTermPolicy.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            await expect(useCase.execute(queueJob)).rejects.toMatchObject({
                isFatal: true,
                message: 'notification.queue.error.stepsFailed',
                rawError: failedRawError,
            });
            expect(queueJob.updateData).toHaveBeenCalledWith({
                ...queueJob.data,
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });
});
