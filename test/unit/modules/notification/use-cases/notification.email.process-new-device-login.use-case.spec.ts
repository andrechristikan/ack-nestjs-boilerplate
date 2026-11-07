import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailQueuePayload,
    INotificationEmailResult,
    INotificationNewDeviceLoginPayload,
} from '@modules/notification/interfaces/notification.interface';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { NotificationEmailProcessNewDeviceLoginUseCase } from '@modules/notification/use-cases/notification.email.process-new-device-login.use-case';

describe('NotificationEmailProcessNewDeviceLoginUseCase', () => {
    const notificationEmailSecurityService: MockProxy<NotificationEmailSecurityService> =
        mock<NotificationEmailSecurityService>();
    let useCase: NotificationEmailProcessNewDeviceLoginUseCase;

    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedEmail: 'cipher(nadia@example.com)',
        username: 'nadia',
        cc: [],
        bcc: [],
    };
    const response: INotificationEmailResult = {
        message: 'processed',
        result: { $metadata: {}, MessageId: 'message-id' },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessNewDeviceLoginUseCase,
                {
                    provide: NotificationEmailSecurityService,
                    useValue: notificationEmailSecurityService,
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessNewDeviceLoginUseCase);
    });

    describe('execute', () => {
        it('forwards send and data to the security domain', async () => {
            const requestLog: IRequestLog = {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: null,
                    device: null,
                    engine: null,
                    os: null,
                },
                ipAddress: null,
                geoLocation: null,
            };
            const data: INotificationNewDeviceLoginPayload = {
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                loginAt: '2024-01-01T00:00:00.000Z',
                requestLog,
            };
            notificationEmailSecurityService.processNewDeviceLogin.mockResolvedValue(
                response
            );
            const job = buildQueueJob<
                INotificationEmailQueuePayload<typeof data>,
                IQueueResponse,
                EnumNotificationProcess
            >({ send, data });

            const result = await useCase.execute(job);

            expect(
                notificationEmailSecurityService.processNewDeviceLogin
            ).toHaveBeenCalledWith(send, data);
            expect(result).toBe(response);
        });
    });
});
