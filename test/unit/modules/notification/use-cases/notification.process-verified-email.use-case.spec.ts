import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationAccountService } from '@modules/notification/services/notification.account.service';
import {
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationQueuePayload,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import { NotificationProcessVerifiedEmailUseCase } from '@modules/notification/use-cases/notification.process-verified-email.use-case';

describe('NotificationProcessVerifiedEmailUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationAccountService: MockProxy<NotificationAccountService> =
        mock<NotificationAccountService>();
    let useCase: NotificationProcessVerifiedEmailUseCase;

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
                NotificationProcessVerifiedEmailUseCase,
                NotificationUtil,
                {
                    provide: NotificationAccountService,
                    useValue: notificationAccountService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationProcessVerifiedEmailUseCase);
    });

    describe('execute', () => {
        const data = { reference: 'ref-1' };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            recipient: TestEncryptedRecipient,
            proceedBy: 'user-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationAccountService.processVerifiedEmail.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await useCase.execute(queueJob);

            expect(
                notificationAccountService.processVerifiedEmail
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
            notificationAccountService.processVerifiedEmail.mockResolvedValue(
                failed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
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
