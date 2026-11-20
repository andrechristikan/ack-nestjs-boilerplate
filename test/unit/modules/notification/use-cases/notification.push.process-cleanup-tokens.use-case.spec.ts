import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import type { INotificationPushCleanupTokenEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';

describe('NotificationPushProcessCleanupTokensUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    let useCase: NotificationPushProcessCleanupTokensUseCase;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushProcessCleanupTokensUseCase,
                { provide: NotificationService, useValue: notificationService },
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessCleanupTokensUseCase);
    });

    describe('execute', () => {
        it('decrypts the failure tokens, cleans them up, and reports the requested and removed counts', async () => {
            const cleanupResult = {
                message: 'notification.queue.push.cleanupTokens',
                countRequestedTokens: 2,
                countRemovedTokens: 1,
            };
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-1',
                'token-2',
            ]);
            deviceService.cleanupNotificationTokens.mockResolvedValue(1);
            notificationService.toCleanupTokensResult.mockReturnValue(
                cleanupResult
            );
            const data: INotificationPushCleanupTokenEncryptedPayload = {
                userId: 'user-id',
                encryptedFailureTokens: ['cipher(token-1)', 'cipher(token-2)'],
            };

            const result = await useCase.execute(data);

            expect(
                notificationService.decryptFailureTokens
            ).toHaveBeenCalledWith('user-id', [
                'cipher(token-1)',
                'cipher(token-2)',
            ]);
            expect(
                deviceService.cleanupNotificationTokens
            ).toHaveBeenCalledWith('user-id', ['token-1', 'token-2']);
            expect(
                notificationService.toCleanupTokensResult
            ).toHaveBeenCalledWith(2, 1);
            expect(result).toEqual(cleanupResult);
        });

        it('cleans up nothing when the decryption fails', async () => {
            const failure = new Error('decrypt');
            notificationService.decryptFailureTokens.mockImplementation(() => {
                throw failure;
            });
            const data: INotificationPushCleanupTokenEncryptedPayload = {
                userId: 'user-id',
                encryptedFailureTokens: ['bad'],
            };

            await expect(useCase.execute(data)).rejects.toBe(failure);
            expect(
                deviceService.cleanupNotificationTokens
            ).not.toHaveBeenCalled();
        });
    });
});
