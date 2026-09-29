import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';

describe('NotificationPushMaintenanceDomain', () => {
    const deviceDomain = mock<DeviceDomain>();
    const configService = mock<ConfigService>();
    let domain: NotificationPushMaintenanceDomain;

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
                NotificationPushMaintenanceDomain,
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(NotificationPushMaintenanceDomain);
    });

    describe('processCleanupTokens', () => {
        it('cleans up the given failure tokens and reports the counts', async () => {
            deviceDomain.cleanupNotificationTokens.mockResolvedValue(2);

            const result = await domain.processCleanupTokens('user-id', [
                'token-1',
                'token-2',
            ]);

            expect(deviceDomain.cleanupNotificationTokens).toHaveBeenCalledWith(
                'user-id',
                ['token-1', 'token-2']
            );
            expect(result).toEqual({
                message: 'Processed token cleanup for invalid tokens',
                countRequestedTokens: 2,
                countRemovedTokens: 2,
            });
        });
    });

    describe('processCleanupStaleTokens', () => {
        it('cleans up tokens older than the configured stale threshold', async () => {
            deviceDomain.cleanupStaleNotificationTokens.mockResolvedValue(5);

            const result = await domain.processCleanupStaleTokens();

            expect(
                deviceDomain.cleanupStaleNotificationTokens
            ).toHaveBeenCalledWith(86_400_000);
            expect(result).toEqual({
                message: 'Processed stale token cleanup',
                countRemovedTokens: 5,
            });
        });
    });
});
