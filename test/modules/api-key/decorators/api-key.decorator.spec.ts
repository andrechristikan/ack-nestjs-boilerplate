import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import {
    ApiKeyPayload,
    ApiKeyProtected,
    ApiKeySystemProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

describe('api-key.decorator', () => {
    describe('ApiKeySystemProtected', () => {
        it('mounts the x-api-key guards and the system type metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            ApiKeySystemProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard]);
            expect(
                Reflect.getMetadata(ApiKeyXTypeMetaKey, descriptor.value)
            ).toEqual([EnumApiKeyType.system]);
        });
    });

    describe('ApiKeyProtected', () => {
        it('mounts the x-api-key guards and the default type metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            ApiKeyProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard]);
            expect(
                Reflect.getMetadata(ApiKeyXTypeMetaKey, descriptor.value)
            ).toEqual([EnumApiKeyType.default]);
        });
    });

    describe('ApiKeyPayload', () => {
        const clsService =
            mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext = mock<ExecutionContext>();
        const apiKey: ApiKey = {
            id: 'api-key-1',
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            key: 'local_abc123',
            hash: 'hashed-secret',
            isActive: true,
            startAt: null,
            endAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: 'user-1',
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedBy: 'user-1',
        };

        function extractFactory(): (
            data: Extract<keyof ApiKey, string> | undefined,
            ctx: ExecutionContext
        ) => unknown {
            const target = {} as Type<unknown>;

            ApiKeyPayload()(target, 'apiKeyPayload', 0);

            const metadata = Reflect.getMetadata(
                ROUTE_ARGS_METADATA,
                target.constructor,
                'apiKeyPayload'
            ) as Record<
                string,
                {
                    factory: (
                        data: Extract<keyof ApiKey, string> | undefined,
                        ctx: ExecutionContext
                    ) => unknown;
                }
            >;
            const [paramMetadata] = Object.values(metadata);

            return paramMetadata.factory;
        }

        function expectContextMissingException(
            thrown: unknown,
            contextKey: string
        ): void {
            expect(thrown).toBeInstanceOf(RequestContextMissingException);
            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message: expect.stringContaining(contextKey),
                }),
            });
        }

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException when the api-key store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const factory = extractFactory();

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown, ApiKeyStoreKey);
        });

        it('throws RequestContextMissingException when the api-key store is null', () => {
            clsService.get.mockReturnValue(null);
            const factory = extractFactory();

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown, ApiKeyStoreKey);
        });

        it('returns the whole api key when no field is requested', () => {
            clsService.get.mockReturnValue(apiKey);
            const factory = extractFactory();

            expect(factory(undefined, executionContext)).toBe(apiKey);
        });

        it('returns one field of the api key when a field is requested', () => {
            clsService.get.mockReturnValue(apiKey);
            const factory = extractFactory();

            expect(factory('name', executionContext)).toBe(apiKey.name);
        });

        it('throws RequestContextMissingException when the requested field is undefined', () => {
            clsService.get.mockReturnValue({
                ...apiKey,
                createdBy: undefined,
            } as unknown as ApiKey);
            const factory = extractFactory();

            let thrown: unknown;
            try {
                factory('createdBy', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(
                thrown,
                `${ApiKeyStoreKey}.createdBy`
            );
        });

        it('throws RequestContextMissingException when the requested field is null', () => {
            clsService.get.mockReturnValue(apiKey);
            const factory = extractFactory();

            let thrown: unknown;
            try {
                factory('startAt', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectContextMissingException(thrown, `${ApiKeyStoreKey}.startAt`);
        });
    });
});
