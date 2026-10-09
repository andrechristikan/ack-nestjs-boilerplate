import { HttpStatus } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Messaging } from 'firebase-admin/messaging';
import type { App as FirebaseApp } from 'firebase-admin/app';
import type { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import type { HelperArrayService } from '@common/helper/services/helper.array.service';
import { FirebaseMaxSendPushBatchSize } from '@common/firebase/constants/firebase.constant';
import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';
import {
    createFirebaseService,
    createInitializedFirebaseService,
} from '@test/unit/helpers/test.unit.firebase.helper';
import type {
    IFirebaseCredentials,
    IFirebaseServiceDoubles,
} from '@test/unit/helpers/test.unit.firebase.helper';

vi.mock('firebase-admin', () => ({
    initializeApp: vi.fn(),
    cert: vi.fn(),
}));
vi.mock('firebase-admin/messaging', () => ({
    getMessaging: vi.fn(),
}));

describe('FirebaseService', () => {
    const firebaseUtil: MockProxy<FirebaseUtil> = mock<FirebaseUtil>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();

    let firebaseAdmin: typeof import('firebase-admin');
    let getMessaging: typeof import('firebase-admin/messaging').getMessaging;

    let service: InstanceType<
        typeof import('@common/firebase/services/firebase.service').FirebaseService
    >;

    const firebaseDoubles: IFirebaseServiceDoubles = {
        firebaseUtil,
        helperArrayService,
    };

    const fullCredentials: IFirebaseCredentials = {
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

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        firebaseAdmin = await import('firebase-admin');
        ({ getMessaging } = await import('firebase-admin/messaging'));

        service = await createFirebaseService(fullCredentials, firebaseDoubles);
    });

    describe('onModuleInit', () => {
        it('warns and skips initialization when projectId is missing', async () => {
            const notConfigured = await createFirebaseService(
                {
                    ...fullCredentials,
                    projectId: null,
                },
                firebaseDoubles
            );

            await notConfigured.onModuleInit();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
            expect(notConfigured.isInitialized()).toBe(false);
        });

        it('warns and skips initialization when clientEmail is missing', async () => {
            const notConfigured = await createFirebaseService(
                {
                    ...fullCredentials,
                    clientEmail: null,
                },
                firebaseDoubles
            );

            await notConfigured.onModuleInit();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
        });

        it('warns and skips initialization when the raw privateKey is unset', async () => {
            const notConfigured = await createFirebaseService(
                {
                    ...fullCredentials,
                    privateKey: null,
                },
                firebaseDoubles,
                null
            );

            await expect(notConfigured.onModuleInit()).resolves.toBeUndefined();

            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
            expect(notConfigured.isInitialized()).toBe(false);
        });

        it('throws when the configured privateKey fails to normalize', async () => {
            const misconfigured = await createFirebaseService(
                {
                    ...fullCredentials,
                    privateKey: null,
                },
                firebaseDoubles
            );

            await expect(misconfigured.onModuleInit()).rejects.toMatchObject({
                module: 'app',
                message: 'Firebase private key could not be normalized',
                rawError: null,
            });
            expect(firebaseAdmin.initializeApp).not.toHaveBeenCalled();
            expect(misconfigured.isInitialized()).toBe(false);
        });

        it('initializes the Admin SDK and messaging when every credential is present', async () => {
            const app = {} as FirebaseApp;
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            vi.mocked(firebaseAdmin.cert).mockReturnValue(
                'credential' as never
            );
            vi.mocked(firebaseAdmin.initializeApp).mockReturnValue(app);
            vi.mocked(getMessaging).mockReturnValue(messaging);
            const initialized = await createFirebaseService(
                fullCredentials,
                firebaseDoubles
            );

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

        it('throws a failure raised while initializing', async () => {
            const cause = new Error('init failed');
            vi.mocked(firebaseAdmin.cert).mockReturnValue(
                'credential' as never
            );
            vi.mocked(firebaseAdmin.initializeApp).mockImplementation(() => {
                throw cause;
            });
            const initialized = await createFirebaseService(
                fullCredentials,
                firebaseDoubles
            );

            await expect(initialized.onModuleInit()).rejects.toMatchObject({
                module: 'app',
                message: 'Failed to initialize Firebase Admin SDK',
                rawError: cause,
            });
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
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockResolvedValue('message-id');
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

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

        it('sends the notification with no imageUrl and no data when the payload has none', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockResolvedValue('message-id');
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const result = await initialized.sendPush('token-1', {
                title: payload.title,
                body: payload.body,
            });

            expect(messaging.send).toHaveBeenCalledWith({
                token: 'token-1',
                notification: { title: payload.title, body: payload.body },
            });
            expect(result).toBe(true);
        });

        it('returns false and warns on an invalid-token FCM error', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockRejectedValue({
                code: 'messaging/invalid-registration-token',
            });
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error on a non-invalid-token FCM error', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockRejectedValue({
                code: 'messaging/internal-error',
            });
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error when the rejection is not an object', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockRejectedValue('plain string failure');
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const result = await initialized.sendPush('token-1', payload);

            expect(result).toBe(false);
        });

        it('returns false and logs an error when the rejection is null', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            messaging.send.mockRejectedValue(null);
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

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
                retryTokens: [],
                successCount: 0,
                failureCount: 2,
            });
        });

        it('returns a zero result immediately for an empty token list', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const result = await initialized.sendMulticast([], payload);

            expect(result).toEqual({
                failureTokens: [],
                retryTokens: [],
                successCount: 0,
                failureCount: 0,
            });
            expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
        });

        it('throws when chunkSize is below one', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const rejection = initialized.sendMulticast(
                ['token-1'],
                payload,
                0
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
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );

            const rejection = initialized.sendMulticast(
                ['token-1'],
                payload,
                FirebaseMaxSendPushBatchSize + 1
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
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
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
                retryTokens: ['token-3', 'token-4'],
            });
        });

        it('counts an entire rejected chunk as failures', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
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
                retryTokens: chunkB,
            });
        });

        it('returns every token of a rejected chunk as retryTokens', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['t1', 't2'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockRejectedValueOnce(
                new Error('fcm down')
            );

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result).toEqual({
                successCount: 0,
                failureCount: 2,
                failureTokens: [],
                retryTokens: ['t1', 't2'],
            });
        });

        it('splits a per-token failure into invalid and retryable', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['ok', 'bad', 'later'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 1,
                failureCount: 2,
                responses: [
                    { success: true },
                    {
                        success: false,
                        error: {
                            code: 'messaging/registration-token-not-registered',
                        },
                    },
                    {
                        success: false,
                        error: { code: 'messaging/internal-error' },
                    },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result.failureTokens).toEqual(['bad']);
            expect(result.retryTokens).toEqual(['later']);
        });

        it('puts a permanent non-invalid failure code in neither list', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['too-big'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 0,
                failureCount: 1,
                responses: [
                    {
                        success: false,
                        error: {
                            code: 'messaging/payload-size-limit-exceeded',
                        },
                    },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result).toEqual({
                successCount: 0,
                failureCount: 1,
                failureTokens: [],
                retryTokens: [],
            });
        });

        it('counts an invalid-argument payload failure without purging or retrying the token', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['good-token'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 0,
                failureCount: 1,
                responses: [
                    {
                        success: false,
                        error: { code: 'messaging/invalid-argument' },
                    },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result).toEqual({
                successCount: 0,
                failureCount: 1,
                failureTokens: [],
                retryTokens: [],
            });
        });

        it('puts a mismatched-credential failure in failureTokens', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['other-project'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 0,
                failureCount: 1,
                responses: [
                    {
                        success: false,
                        error: { code: 'messaging/mismatched-credential' },
                    },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result.failureTokens).toEqual(['other-project']);
            expect(result.retryTokens).toEqual([]);
        });

        it('puts a transient code and a code-less failure in retryTokens', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['busy', 'unknown'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 0,
                failureCount: 2,
                responses: [
                    {
                        success: false,
                        error: { code: 'messaging/server-unavailable' },
                    },
                    { success: false },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result.failureTokens).toEqual([]);
            expect(result.retryTokens).toEqual(['busy', 'unknown']);
        });

        it('puts an app network-error and network-timeout failure in retryTokens', async () => {
            const messaging: MockProxy<Messaging> = mock<Messaging>();
            const initialized = await createInitializedFirebaseService(
                fullCredentials,
                firebaseDoubles,
                messaging
            );
            const tokens = ['dropped', 'slow'];
            helperArrayService.chunk.mockReturnValue([tokens]);
            messaging.sendEachForMulticast.mockResolvedValueOnce({
                successCount: 0,
                failureCount: 2,
                responses: [
                    {
                        success: false,
                        error: { code: 'app/network-error' },
                    },
                    {
                        success: false,
                        error: { code: 'app/network-timeout' },
                    },
                ],
            } as never);

            const result = await initialized.sendMulticast(tokens, payload);

            expect(result.failureTokens).toEqual([]);
            expect(result.retryTokens).toEqual(['dropped', 'slow']);
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
