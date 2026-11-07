import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';

describe('NotificationPushProcessCleanupStaleTokensUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    let useCase: NotificationPushProcessCleanupStaleTokensUseCase;

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
                NotificationPushProcessCleanupStaleTokensUseCase,
                NotificationUtil,
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessCleanupStaleTokensUseCase);
    });

    describe('execute', () => {
        it('cleans up tokens older than the configured threshold and reports the removed count', async () => {
            deviceService.cleanupStaleNotificationTokens.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(
                deviceService.cleanupStaleNotificationTokens
            ).toHaveBeenCalledWith(86_400_000);
            expect(result).toEqual({
                message: 'notification.queue.push.cleanupStaleTokens',
                countRemovedTokens: 3,
            });
        });
    });
});
