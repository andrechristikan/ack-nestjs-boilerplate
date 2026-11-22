import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('NotificationPushProcessCleanupStaleTokensUseCase', () => {
    let configService: MockProxy<ConfigService>;
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    let useCase: NotificationPushProcessCleanupStaleTokensUseCase;

    beforeEach(async () => {
        configService = buildConfigService({
            'notification.push.staleTokenThresholdInMs': 86_400_000,
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: ConfigService, useValue: configService },
                NotificationPushProcessCleanupStaleTokensUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessCleanupStaleTokensUseCase);
    });

    describe('execute', () => {
        it('cleans up tokens older than the configured threshold and reports the removed count', async () => {
            const message = 'Processed stale token cleanup: 3 removed.';
            deviceService.cleanupStaleNotificationTokens.mockResolvedValue(3);
            messageService.setMessage.mockReturnValue(message);

            const result = await useCase.execute();

            expect(
                deviceService.cleanupStaleNotificationTokens
            ).toHaveBeenCalledWith(86_400_000);
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.cleanupStaleTokens',
                { properties: { count: 3 } }
            );
            expect(result).toEqual({ message });
            expect(configService.get).toHaveBeenCalledTimes(1);
        });
    });
});
