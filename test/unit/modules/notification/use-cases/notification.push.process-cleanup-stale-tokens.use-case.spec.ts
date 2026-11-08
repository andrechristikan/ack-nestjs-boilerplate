import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';

describe('NotificationPushProcessCleanupStaleTokensUseCase', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    let useCase: NotificationPushProcessCleanupStaleTokensUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'notification.push.staleTokenThresholdInMs': 86_400_000,
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: ConfigService, useValue: configService },
                NotificationPushProcessCleanupStaleTokensUseCase,
                { provide: NotificationService, useValue: notificationService },
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessCleanupStaleTokensUseCase);
    });

    describe('execute', () => {
        it('cleans up tokens older than the configured threshold and reports the removed count', async () => {
            const cleanupResult = {
                message: 'notification.queue.push.cleanupStaleTokens',
                countRemovedTokens: 3,
            };
            deviceService.cleanupStaleNotificationTokens.mockResolvedValue(3);
            notificationService.toCleanupStaleTokensResult.mockReturnValue(
                cleanupResult
            );

            const result = await useCase.execute();

            expect(
                deviceService.cleanupStaleNotificationTokens
            ).toHaveBeenCalledWith(86_400_000);
            expect(
                notificationService.toCleanupStaleTokensResult
            ).toHaveBeenCalledWith(3);
            expect(result).toEqual(cleanupResult);
        });
    });
});
