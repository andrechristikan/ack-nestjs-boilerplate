import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';

describe('NotificationPushMaintenanceDomain', () => {
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const thresholdInMs = 86_400_000;
    let service: NotificationPushMaintenanceDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        Reflect.set(
            configService,
            'get',
            vi.fn().mockReturnValue(thresholdInMs)
        );
        service = new NotificationPushMaintenanceDomain(
            deviceDomain,
            configService
        );
    });

    it('removes rejected tokens and reports requested and removed counts', async () => {
        deviceDomain.cleanupNotificationTokens.mockResolvedValue(1);

        await expect(
            service.processCleanupTokens('user-id', ['bad-1', 'bad-2'])
        ).resolves.toEqual({
            message: 'Processed token cleanup for invalid tokens',
            countRequestedTokens: 2,
            countRemovedTokens: 1,
        });
        expect(deviceDomain.cleanupNotificationTokens).toHaveBeenCalledWith(
            'user-id',
            ['bad-1', 'bad-2']
        );
    });

    it('removes tokens older than the configured threshold', async () => {
        deviceDomain.cleanupStaleNotificationTokens.mockResolvedValue(3);

        await expect(service.processCleanupStaleTokens()).resolves.toEqual({
            message: 'Processed stale token cleanup',
            countRemovedTokens: 3,
        });
        expect(
            deviceDomain.cleanupStaleNotificationTokens
        ).toHaveBeenCalledWith(thresholdInMs);
    });
});
