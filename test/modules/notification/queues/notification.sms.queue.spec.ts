import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import { EnumNotificationSmsProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationSendSmsPayload,
    INotificationSendSmsVerificationPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

describe('NotificationSmsQueue', () => {
    const notificationSmsQueue = mock<Queue>();
    const configService = mock<ConfigService>();
    const helperHashService = mock<HelperHashService>();
    let queue: NotificationSmsQueue;

    const payload: INotificationSendSmsPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        kind: EnumNotificationSmsProcess.newDeviceLogin,
        phoneNumber: '+628123456789',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'notification.dedupTtlInMs': 60_000,
            };

            return values[key];
        });
        helperHashService.sha256Hash.mockReturnValue('hashed-number');
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsQueue,
                {
                    provide: getQueueToken(EnumQueue.notificationSms),
                    useValue: notificationSmsQueue,
                },
                { provide: ConfigService, useValue: configService },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        queue = module.get(NotificationSmsQueue);
    });

    describe('sendSecurityAlert', () => {
        it('queue adds a job with no secret fields', async () => {
            await queue.sendSecurityAlert(payload);

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                payload.phoneNumber
            );
            expect(notificationSmsQueue.add).toHaveBeenCalledWith(
                EnumNotificationSmsProcess.newDeviceLogin,
                {
                    userId: 'user-id',
                    notificationId: 'notification-id',
                    kind: EnumNotificationSmsProcess.newDeviceLogin,
                    phoneNumber: '+628123456789',
                },
                {
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: `${EnumNotificationSmsProcess.newDeviceLogin}-${payload.userId}-hashed-number`,
                        ttl: 60_000,
                    },
                }
            );
        });

        it('does not add a job when there are no phone number', async () => {
            await queue.sendSecurityAlert({ ...payload, phoneNumber: '' });

            expect(notificationSmsQueue.add).not.toHaveBeenCalled();
        });

        it('uses a distinct deduplication key for each recipient', async () => {
            helperHashService.sha256Hash
                .mockReturnValueOnce('first')
                .mockReturnValueOnce('second');
            await queue.sendSecurityAlert(payload);
            await queue.sendSecurityAlert({
                ...payload,
                phoneNumber: '+628987654321',
            });

            expect(notificationSmsQueue.add).toHaveBeenNthCalledWith(
                1,
                payload.kind,
                payload,
                expect.objectContaining({
                    deduplication: {
                        id: `${payload.kind}-${payload.userId}-first`,
                        ttl: 60_000,
                    },
                })
            );
            expect(notificationSmsQueue.add).toHaveBeenNthCalledWith(
                2,
                payload.kind,
                { ...payload, phoneNumber: '+628987654321' },
                expect.objectContaining({
                    deduplication: {
                        id: `${payload.kind}-${payload.userId}-second`,
                        ttl: 60_000,
                    },
                })
            );
        });
    });

    describe('sendVerificationMobileNumber', () => {
        const verificationPayload: INotificationSendSmsVerificationPayload = {
            userId: 'user-id',
            notificationId: 'notification-id',
            phoneNumber: '+628123456789',
            encryptedOtp: 'cipher-otp',
            expiredInMinutes: 5,
            mobileNumberId: 'mobile-id',
            reference: 'ref-1',
        };

        it('sendVerificationMobileNumber enqueues with high priority and notification-scoped dedup', async () => {
            await queue.sendVerificationMobileNumber(verificationPayload);

            expect(notificationSmsQueue.add).toHaveBeenCalledWith(
                EnumNotificationSmsProcess.verificationMobileNumber,
                verificationPayload,
                {
                    priority: EnumQueuePriority.high,
                    deduplication: {
                        id: 'verificationMobileNumber-user-id-notification-id',
                        ttl: 60_000,
                    },
                }
            );
        });

        it('returns without add when phoneNumber is empty', async () => {
            await queue.sendVerificationMobileNumber({
                ...verificationPayload,
                phoneNumber: '',
            });

            expect(notificationSmsQueue.add).not.toHaveBeenCalled();
        });
    });

    it('supports only the approved SMS kinds', () => {
        expect(Object.values(EnumNotificationSmsProcess)).toEqual([
            EnumNotificationSmsProcess.resetTwoFactorByAdmin,
            EnumNotificationSmsProcess.newDeviceLogin,
            EnumNotificationSmsProcess.verificationMobileNumber,
        ]);
    });
});
