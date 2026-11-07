import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationSecurityService } from '@modules/notification/services/notification.security.service';
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
import { NotificationProcessTemporaryPasswordByAdminUseCase } from '@modules/notification/use-cases/notification.process-temporary-password-by-admin.use-case';

describe('NotificationProcessTemporaryPasswordByAdminUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationSecurityService: MockProxy<NotificationSecurityService> =
        mock<NotificationSecurityService>();
    let useCase: NotificationProcessTemporaryPasswordByAdminUseCase;

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
                NotificationProcessTemporaryPasswordByAdminUseCase,
                NotificationUtil,
                {
                    provide: NotificationSecurityService,
                    useValue: notificationSecurityService,
                },
            ],
        }).compile();
        useCase = module.get(
            NotificationProcessTemporaryPasswordByAdminUseCase
        );
    });

    describe('execute', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        const jobData = {
            userId: 'user-id',
            notificationId: 'n-1',
            completedSteps: [],
            recipient: TestEncryptedRecipient,
            proceedBy: 'admin-id',
            data: data,
        };

        it('records progress and returns the step response when every step succeeded', async () => {
            notificationSecurityService.processTemporaryPasswordByAdmin.mockResolvedValue(
                completed
            );
            const queueJob = buildQueueJob<
                INotificationQueuePayload<typeof data>,
                unknown,
                EnumNotificationProcess
            >(jobData);

            const result = await useCase.execute(queueJob);

            expect(
                notificationSecurityService.processTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(
                'user-id',
                'admin-id',
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
            notificationSecurityService.processTemporaryPasswordByAdmin.mockResolvedValue(
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
