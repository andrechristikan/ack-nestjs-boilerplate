import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Messaging } from 'firebase-admin/messaging';
import type { App as FirebaseApp } from 'firebase-admin/app';
import type { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import type { HelperArrayService } from '@common/helper/services/helper.array.service';
import { FirebaseMaxSendPushBatchSize } from '@common/firebase/constants/firebase.constant';
import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';

vi.mock('firebase-admin', () => ({
    initializeApp: vi.fn(),
    cert: vi.fn(),
}));
vi.mock('firebase-admin/messaging', () => ({
    getMessaging: vi.fn(),
}));

describe('FirebaseService', () => {
    const configGet = vi.fn<(key: string) => string | null | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const firebaseUtil: MockProxy<FirebaseUtil> = mock<FirebaseUtil>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();

    let firebaseAdmin: typeof import('firebase-admin');
    let getMessaging: typeof import('firebase-admin/messaging').getMessaging;
    let FirebaseService: typeof import('@common/firebase/services/firebase.service').FirebaseService;
    let FirebaseUtilClass: typeof import('@common/firebase/utils/firebase.util').FirebaseUtil;
    let HelperArrayServiceClass: typeof import('@common/helper/services/helper.array.service').HelperArrayService;
    let FirebaseChunkSizeInvalidException: typeof import('@common/firebase/exceptions/firebase.chunk-size-invalid.exception').FirebaseChunkSizeInvalidException;

    let service: InstanceType<
        typeof import('@common/firebase/services/firebase.service').FirebaseService
    >;

    interface ICredentials {
        projectId: string | null;
        clientEmail: string | null;
        privateKey: string | null;
    }

    const build = async (
        credentials: ICredentials
    ): Promise<InstanceType<typeof FirebaseService>> => {
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | null> = {
                'firebase.projectId': credentials.projectId,
                'firebase.clientEmail': credentials.clientEmail,
                'firebase.privateKey': 'raw-private-key',
            };

            return values[key];
        });
        firebaseUtil.normalizePrivateKey.mockReturnValue(
            credentials.privateKey
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FirebaseService,
                { provide: ConfigService, useValue: configService },
                { provide: FirebaseUtilClass, useValue: firebaseUtil },
                {
                    provide: HelperArrayServiceClass,
                    useValue: helperArrayService,
                },
            ],
        }).compile();

        return module.get(FirebaseService);
    };

    const fullCredentials: ICredentials = {
        projectId: 'project-1',
        clientEmail: 'sa@project-1.iam.gserviceaccount.com',
        privateKey: 'normalized-private-key',
    };

    const payload: IFirebasePushPayload = {
        title: 'Title',
        body: 'Body',
        imageUrl: 'https://example.com/image.png',
        data: { key: 'value' },
    };

    const initialize = async (
        messagingImpl: MockProxy<Messaging>
    ): Promise<InstanceType<typeof FirebaseService>> => {
        const app = {} as FirebaseApp;
        vi.mocked(firebaseAdmin.cert).mockReturnValue('credential' as never);
        vi.mocked(firebaseAdmin.initializeApp).mockReturnValue(app);
        vi.mocked(getMessaging).mockReturnValue(messagingImpl);

        const initialized = await build(fullCredentials);
        await initialized.onModuleInit();

        return initialized;
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        firebaseAdmin = await import('firebase-admin');
        ({ getMessaging } = await import('firebase-admin/messaging'));
        ({ FirebaseService } =
            await import('@common/firebase/services/firebase.service'));
        ({ FirebaseUtil: FirebaseUtilClass } =
            await import('@common/firebase/utils/firebase.util'));
        ({ HelperArrayService: HelperArrayServiceClass } =
            await import('@common/helper/services/helper.array.service'));
        ({ FirebaseChunkSizeInvalidException } =
            await import('@common/firebase/exceptions/firebase.chunk-size-invalid.exception'));

        service = await build(fullCredentials);
    });

    describe('onModuleInit', () => {
        it('warns and skips initialization when projectId is missing', async () => {
            const notConfigured = await build({
                ...fullCredentials,
                projectId: null,
            });

            await notConfigured.onModuleInit();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
            expect(notConfigured.isInitialized()).toBe(false);
        });

        it('warns and skips initialization when clientEmail is missing', async () => {
            const notConfigured = await build({
                ...fullCredentials,
                clientEmail: null,
            });

            await notConfigured.onModuleInit();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
        });

        it('warns and skips initialization when the normalized privateKey is missing', async () => {
            const notConfigured = await build({
                ...fullCredentials,
                privateKey: null,
            });

            await notConfigured.onModuleInit();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
        });

        it('initializes the Admin SDK and messaging when every credential is present', async () => {
            const app = {} as FirebaseApp;
            const messaging = mock<Messaging>();
            vi.mocked(firebaseAdmin.cert).mockReturnValue(
                'credential' as never
            );
            vi.mocked(firebaseAdmin.initializeApp).mockReturnValue(app);
            vi.mocked(getMessaging).mockReturnValue(messaging);
            const initialized = await build(fullCredentials);

            await initialized.onModuleInit();

            expect(firebaseAdmin.cert).toHaveBeenCalledWith({
                projectId: fullCredentials.projectId,
                clientEmail: fullCredentials.clientEmail,
                privateKey: fullCredentials.privateKey,
            });
            expect(firebaseAdmin.initializeApp).toHaveBeenCalledWith({
                credential: 'credential',
            });
            expect(getMessaging).toHaveBeenCalledWith(app);
            expect(initialized.isInitialized()).toBe(true);
        });

        it('logs and swallows a failure raised while initializing', async () => {
            vi.mocked(firebaseAdmin.cert).mockReturnValue(
                'credential' as never
            );
            vi.mocked(firebaseAdmin.initializeApp).mockImplementation(() => {
                throw new Error('init failed');
            });
            const initialized = await build(fullCredentials);

            await expect(initialized.onModuleInit()).resolves.toBeUndefined();
            expect(initialized.isInitialized()).toBe(false);
        });
    });

    describe('isInitialized', () => {
        it('returns false before onModuleInit ever runs', () => {
            expect(service.isInitialized()).toBe(false);
        });
    });

    describe('sendPush', () => {
        it('returns false without sending when not initialized', async () => {
            const result = await service.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('sends the push and returns true on success', async () => {
            const messaging = mock<Messaging>();
            messaging.send.mockResolvedValue('message-id');
            const initialized = await initialize(messaging);

            const result = await initialized.sendPush('token-1', payload);

            expect(messaging.send).toHaveBeenCalledWith({
                token: 'token-1',
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            });
            expect(result).toBe(true);
        });

        it('returns false and warns on an invalid-token FCM error', async () => {
            const messaging = mock<Messaging>();
            messaging.send.mockRejectedValue({
                code: 'messaging/invalid-registration-token',
            });
            const initialized = await initialize(messaging);

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error on a non-invalid-token FCM error', async () => {
            const messaging = mock<Messaging>();
            messaging.send.mockRejectedValue({
                code: 'messaging/internal-error',
            });
            const initialized = await initialize(messaging);

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error when the rejection is not an object', async () => {
            const messaging = mock<Messaging>();
            messaging.send.mockRejectedValue('plain string failure');
            const initialized = await initialize(messaging);

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error when the rejection is null', async () => {
            const messaging = mock<Messaging>();
            messaging.send.mockRejectedValue(null);
            const initialized = await initialize(messaging);

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });
    });

    describe('sendMulticast', () => {
        it('returns an all-failure result without sending when not initialized', async () => {
            const result = await service.sendMulticast(
                ['token-1', 'token-2'],
                payload
            );

            expect(result).toEqual({
                failureTokens: [],
                successCount: 0,
                failureCount: 2,
            });
        });

        it('returns a zero result immediately for an empty token list', async () => {
            const messaging = mock<Messaging>();
            const initialized = await initialize(messaging);

            const result = await initialized.sendMulticast([], payload);

            expect(result).toEqual({
                failureTokens: [],
                successCount: 0,
                failureCount: 0,
            });
            expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
        });

        it('throws when chunkSize is below one', async () => {
            const messaging = mock<Messaging>();
            const initialized = await initialize(messaging);

            const rejection = initialized.sendMulticast(
                ['token-1'],
                payload,
                0
            );

            await expect(rejection).rejects.toBeInstanceOf(
                FirebaseChunkSizeInvalidException
            );
            await expect(rejection).rejects.toMatchObject({
                module: 'firebase',
                statusCode: EnumFirebaseStatusCodeError.chunkSizeInvalid,
                statusCodeKey:
                    EnumFirebaseStatusCodeError[
                        EnumFirebaseStatusCodeError.chunkSizeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'firebase.error.chunkSizeInvalid',
            });
        });

        it('throws when chunkSize exceeds the FCM batch limit', async () => {
            const messaging = mock<Messaging>();
            const initialized = await initialize(messaging);

            const rejection = initialized.sendMulticast(
                ['token-1'],
                payload,
                FirebaseMaxSendPushBatchSize + 1
            );

            await expect(rejection).rejects.toBeInstanceOf(
                FirebaseChunkSizeInvalidException
            );
            await expect(rejection).rejects.toMatchObject({
                module: 'firebase',
                statusCode: EnumFirebaseStatusCodeError.chunkSizeInvalid,
                statusCodeKey:
                    EnumFirebaseStatusCodeError[
                        EnumFirebaseStatusCodeError.chunkSizeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'firebase.error.chunkSizeInvalid',
            });
        });

        it('chunks the tokens, aggregates fulfilled results, and collects only invalid-token failures', async () => {
            const messaging = mock<Messaging>();
            const initialized = await initialize(messaging);
            const tokens = ['token-1', 'token-2', 'token-3', 'token-4'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValue({
                successCount: 1,
                failureCount: 3,
                responses: [
                    { success: true, messageId: 'm-1' },
                    {
                        success: false,
                        error: { code: 'messaging/invalid-registration-token' },
                    },
                    {
                        success: false,
                        error: { code: 'messaging/internal-error' },
                    },
                    { success: false },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(messaging.sendEachForMulticast).toHaveBeenCalledWith({
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            });
            expect(result).toEqual({
                successCount: 1,
                failureCount: 3,
                failureTokens: ['token-2'],
            });
        });

        it('counts an entire rejected chunk as failures', async () => {
            const messaging = mock<Messaging>();
            const initialized = await initialize(messaging);
            const chunkA = ['token-1'];
            const chunkB = ['token-2', 'token-3'];
            helperArrayService.chunk.mockReturnValue([chunkA, chunkB]);
            messaging.sendEachForMulticast
                .mockResolvedValueOnce({
                    successCount: 1,
                    failureCount: 0,
                    responses: [{ success: true, messageId: 'm-1' }],
                } as never)
                .mockRejectedValueOnce(new Error('chunk failed'));

            const result = await initialized.sendMulticast(
                [...chunkA, ...chunkB],
                payload,
                1
            );

            expect(result).toEqual({
                successCount: 1,
                failureCount: 2,
                failureTokens: [],
            });
        });
    });

    describe('isInvalidTokenError', () => {
        it('returns false when error is null', () => {
            expect(service['isInvalidTokenError'](null)).toBe(false);
        });

        it('returns false when error carries no code', () => {
            expect(service['isInvalidTokenError']({})).toBe(false);
        });

        it('returns true when the code is one of the known invalid-token codes', () => {
            expect(
                service['isInvalidTokenError']({
                    code: 'messaging/invalid-registration-token',
                })
            ).toBe(true);
        });

        it('returns false when the code is not an invalid-token code', () => {
            expect(
                service['isInvalidTokenError']({
                    code: 'messaging/internal-error',
                })
            ).toBe(false);
        });
    });
});
