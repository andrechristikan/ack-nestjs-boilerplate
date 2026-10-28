import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationPushMaintenanceDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let domain: NotificationPushMaintenanceDomain;

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
                NotificationPushMaintenanceDomain,
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        stubCipherDecryption(helperEncryptionService);
        domain = module.get(NotificationPushMaintenanceDomain);
    });

    describe('processCleanupTokens', () => {
        it('decrypts the failure tokens with the user id, cleans them up and reports the counts', async () => {
            deviceDomain.cleanupNotificationTokens.mockResolvedValue(2);

            const result = await domain.processCleanupTokens('user-id', [
                'cipher(token-1)',
                'cipher(token-2)',
            ]);

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(token-1)',
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(deviceDomain.cleanupNotificationTokens).toHaveBeenCalledWith(
                'user-id',
                ['token-1', 'token-2']
            );
            expect(result).toEqual({
                message: 'notification.queue.push.cleanupTokens',
                countRequestedTokens: 2,
                countRemovedTokens: 2,
            });
        });

        it('rethrows a decryption failure without cleaning anything up', async () => {
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw new HelperDecryptFailedException();
            });

            await expect(
                domain.processCleanupTokens('user-id', ['cipher(token-1)'])
            ).rejects.toBeInstanceOf(HelperDecryptFailedException);
            expect(
                deviceDomain.cleanupNotificationTokens
            ).not.toHaveBeenCalled();
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
                message: 'notification.queue.push.cleanupStaleTokens',
                countRemovedTokens: 5,
            });
        });
    });
});
