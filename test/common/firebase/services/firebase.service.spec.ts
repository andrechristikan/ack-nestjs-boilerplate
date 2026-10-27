import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import type { Messaging } from 'firebase-admin/messaging';

import { FirebaseService } from '@common/firebase/services/firebase.service';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';

const firebaseMocks = vi.hoisted(() => ({
    cert: vi.fn(),
    initializeApp: vi.fn(),
    getMessaging: vi.fn(),
}));

vi.mock('firebase-admin', () => ({
    cert: firebaseMocks.cert,
    initializeApp: firebaseMocks.initializeApp,
}));
vi.mock('firebase-admin/messaging', () => ({
    Messaging: vi.fn(),
    getMessaging: firebaseMocks.getMessaging,
}));

describe('FirebaseService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const firebaseUtil: MockProxy<FirebaseUtil> = mock<FirebaseUtil>();
    const messaging: MockProxy<Messaging> = mock<Messaging>();

    const createService = (credentials = true): FirebaseService => {
        Reflect.set(
            configService,
            'get',
            vi.fn((key: string | symbol) =>
                credentials
                    ? {
                          'firebase.projectId': 'project-id',
                          'firebase.clientEmail': 'firebase@example.com',
                          'firebase.privateKey': 'private-key',
                      }[String(key)]
                    : null
            )
        );
        firebaseUtil.normalizePrivateKey.mockReturnValue(
            credentials ? 'normalized-key' : null
        );
        return new FirebaseService(
            configService,
            helperArrayService,
            firebaseUtil
        );
    };

    beforeEach(() => {
        firebaseMocks.cert.mockReturnValue({} as never);
        firebaseMocks.initializeApp.mockReturnValue({ name: 'app' } as never);
        firebaseMocks.getMessaging.mockReturnValue(messaging);
    });

    it('stays disabled without credentials and initializes with normalized credentials', async () => {
        const disabled = createService(false);
        await disabled.onModuleInit();
        expect(disabled.isInitialized()).toBe(false);

        const enabled = createService();
        await enabled.onModuleInit();
        expect(firebaseMocks.cert).toHaveBeenCalledWith({
            projectId: 'project-id',
            clientEmail: 'firebase@example.com',
            privateKey: 'normalized-key',
        });
        expect(enabled.isInitialized()).toBe(true);
    });

    it('remains disabled when Firebase initialization throws', async () => {
        firebaseMocks.initializeApp.mockImplementation(() => {
            throw new Error('invalid credentials');
        });
        const service = createService();

        await expect(service.onModuleInit()).resolves.toBeUndefined();
        expect(service.isInitialized()).toBe(false);
    });

    it('skips single sends while disabled and sends the exact notification when enabled', async () => {
        const service = createService(false);
        await expect(
            service.sendPush('token', {
                title: 'Title',
                body: 'Body',
                imageUrl: 'image',
                data: { id: '1' },
            })
        ).resolves.toBe(false);

        Reflect.set(service, 'app', {});
        Reflect.set(service, 'messaging', messaging);
        messaging.send.mockResolvedValue('message-id');
        await expect(
            service.sendPush('token', {
                title: 'Title',
                body: 'Body',
                imageUrl: 'image',
                data: { id: '1' },
            })
        ).resolves.toBe(true);
        expect(messaging.send).toHaveBeenCalledWith({
            token: 'token',
            notification: { title: 'Title', body: 'Body', imageUrl: 'image' },
            data: { id: '1' },
        });
    });

    it.each([
        [{ code: 'messaging/registration-token-not-registered' }],
        [{ code: 'provider-error' }],
        [new Error('plain error')],
        ['primitive error'],
    ])('returns false for a provider rejection %#', async error => {
        const service = createService();
        Reflect.set(service, 'app', {});
        Reflect.set(service, 'messaging', messaging);
        messaging.send.mockRejectedValue(error);

        await expect(
            service.sendPush('token', { title: 'Title', body: 'Body' })
        ).resolves.toBe(false);
    });

    it('handles disabled, empty, and invalid multicast requests', async () => {
        const service = createService(false);
        await expect(
            service.sendMulticast(['one'], { title: 'Title', body: 'Body' })
        ).resolves.toEqual({
            failureTokens: [],
            successCount: 0,
            failureCount: 1,
        });
        Reflect.set(service, 'app', {});
        Reflect.set(service, 'messaging', messaging);
        await expect(
            service.sendMulticast([], { title: 'Title', body: 'Body' })
        ).resolves.toEqual({
            failureTokens: [],
            successCount: 0,
            failureCount: 0,
        });
        await expect(
            service.sendMulticast(['one'], { title: 'Title', body: 'Body' }, 0)
        ).rejects.toThrow(Error);
        await expect(
            service.sendMulticast(
                ['one'],
                { title: 'Title', body: 'Body' },
                501
            )
        ).rejects.toThrow(Error);
    });

    it('aggregates multicast successes, provider failures, and invalid tokens', async () => {
        const service = createService();
        Reflect.set(service, 'app', {});
        Reflect.set(service, 'messaging', messaging);
        helperArrayService.chunk.mockReturnValue([
            ['good', 'invalid', 'other'],
            ['rejected'],
        ]);
        messaging.sendEachForMulticast
            .mockResolvedValueOnce({
                successCount: 1,
                failureCount: 2,
                responses: [
                    { success: true },
                    {
                        success: false,
                        error: mock({
                            code: 'messaging/registration-token-not-registered',
                            message: 'bad',
                        }),
                    },
                    {
                        success: false,
                        error: mock({ code: 'provider-error', message: 'bad' }),
                    },
                ],
            })
            .mockRejectedValueOnce(new Error('batch failed'));

        await expect(
            service.sendMulticast(
                ['good', 'invalid', 'other', 'rejected'],
                { title: 'Title', body: 'Body' },
                3
            )
        ).resolves.toEqual({
            successCount: 1,
            failureCount: 3,
            failureTokens: ['invalid'],
        });
    });
});
