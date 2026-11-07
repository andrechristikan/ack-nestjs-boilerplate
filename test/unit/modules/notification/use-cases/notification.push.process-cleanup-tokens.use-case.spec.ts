import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationPushCleanupTokenEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';

describe('NotificationPushProcessCleanupTokensUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    let useCase: NotificationPushProcessCleanupTokensUseCase;

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
                NotificationPushProcessCleanupTokensUseCase,
                NotificationUtil,
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessCleanupTokensUseCase);
    });

    describe('execute', () => {
        it('decrypts the failure tokens, cleans them up, and reports the requested and removed counts', async () => {
            stubCipherDecryption(helperEncryptionService);
            deviceService.cleanupNotificationTokens.mockResolvedValue(1);
            const job = buildQueueJob<
                INotificationPushCleanupTokenEncryptedPayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >({
                userId: 'user-id',
                encryptedFailureTokens: ['cipher(token-1)', 'cipher(token-2)'],
            });

            const result = await useCase.execute(job);

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(token-1)',
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(
                deviceService.cleanupNotificationTokens
            ).toHaveBeenCalledWith('user-id', ['token-1', 'token-2']);
            expect(result).toEqual({
                message: 'notification.queue.push.cleanupTokens',
                countRequestedTokens: 2,
                countRemovedTokens: 1,
            });
        });

        it('cleans up nothing when the decryption fails', async () => {
            const failure = new Error('decrypt');
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw failure;
            });
            const job = buildQueueJob<
                INotificationPushCleanupTokenEncryptedPayload,
                IQueueResponse,
                EnumNotificationPushProcess
            >({ userId: 'user-id', encryptedFailureTokens: ['bad'] });

            await expect(useCase.execute(job)).rejects.toBe(failure);
            expect(
                deviceService.cleanupNotificationTokens
            ).not.toHaveBeenCalled();
        });
    });
});
