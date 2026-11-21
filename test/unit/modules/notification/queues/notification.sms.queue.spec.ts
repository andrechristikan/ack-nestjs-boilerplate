import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationQueue,
    EnumNotificationSmsProcess,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipientRecord,
    INotificationSealedData,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('NotificationSmsQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    let queue: NotificationSmsQueue;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'notification.idempotencyKey.stepPattern':
                            '{notificationId}-{step}',
                    }),
                },
                NotificationUtil,
                NotificationSmsQueue,
                {
                    provide: getQueueToken(
                        EnumNotificationQueue.notificationSms
                    ),
                    useValue: bullQueue,
                },
            ],
        }).compile();
        queue = module.get(NotificationSmsQueue);
    });

    describe('sendEffect', () => {
        it('returns the sms send effect keyed by the sendSms step with the kind priority', () => {
            const context: INotificationSealedData = {
                userId: 'user-id',
                proceedBy: 'user-id',
                verificationId: 'verification-id',
                reference: 'VRF-abc',
                expiredInMinutes: 5,
                encryptedOtp: 'encrypted-otp',
                snapshot: null,
            };
            const recipient: INotificationRecipientRecord = {
                userId: 'user-id',
                username: 'invitee',
                encryptedEmail: 'encrypted-email',
                encryptedTokens: [],
                encryptedMobileNumber: 'encrypted-number',
                channels: [EnumNotificationChannel.sms],
            };

            const result = queue.sendEffect(
                EnumNotificationKind.verificationMobileNumber,
                'notification-id',
                context,
                recipient,
                'encrypted-number'
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationSms,
                name: EnumNotificationSmsProcess.send,
                data: {
                    kind: EnumNotificationKind.verificationMobileNumber,
                    notificationId: 'notification-id',
                    userId: 'user-id',
                    username: 'invitee',
                    encryptedMobileNumber: 'encrypted-number',
                    context,
                    completedSteps: [],
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'notification-id-sendSms',
            });
        });
    });
});
