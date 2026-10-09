import { HttpStatus } from '@nestjs/common';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';

describe('api-key.decorator', () => {
    describe('ApiKeySystemProtected', () => {
        it('mounts the x-api-key guards and the system type metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeySystemProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard]);
            expect(
                Reflect.getMetadata(ApiKeyXTypeMetaKey, descriptor.value)
            ).toEqual([EnumApiKeyType.system]);
        });

        it('documents the missing api key store at 401', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeySystemProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.UNAUTHORIZED,
                        messagePath: 'apiKey.error.guardMissing',
                    }),
                ])
            );
        });
    });

    describe('ApiKeyProtected', () => {
        it('mounts the x-api-key guards and the default type metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeyProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard]);
            expect(
                Reflect.getMetadata(ApiKeyXTypeMetaKey, descriptor.value)
            ).toEqual([EnumApiKeyType.default]);
        });

        it('documents the missing api key store at 401', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeyProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.UNAUTHORIZED,
                        messagePath: 'apiKey.error.guardMissing',
                    }),
                ])
            );
        });
    });

    describe('ApiKeyPayload', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
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

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws ApiKeyGuardMissingException when the api-key store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.guardMissing
                    ],
                messagePath: 'apiKey.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
        });

        it('throws ApiKeyGuardMissingException when the api-key store is null', () => {
            clsService.get.mockReturnValue(null);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.guardMissing
                    ],
                messagePath: 'apiKey.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
        });

        it('returns the whole api key when no field is requested', () => {
            clsService.get.mockReturnValue(apiKey);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            expect(factory(undefined, executionContext)).toBe(apiKey);
        });

        it('returns one field of the api key when a field is requested', () => {
            clsService.get.mockReturnValue(apiKey);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            expect(factory('name', executionContext)).toBe(apiKey.name);
        });

        it('throws RequestContextMissingException when the requested field is undefined', () => {
            clsService.get.mockReturnValue({
                ...apiKey,
                createdBy: undefined,
            } as unknown as ApiKey);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            let thrown: unknown;
            try {
                factory('createdBy', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${ApiKeyStoreKey}.createdBy`
            );
        });

        it('throws RequestContextMissingException when the requested field is null', () => {
            clsService.get.mockReturnValue(apiKey);
            const target = {} as Type<unknown>;
            ApiKeyPayload()(target, 'apiKeyPayload', 0);
            const factory = getParamDecoratorFactory(target, 'apiKeyPayload');

            let thrown: unknown;
            try {
                factory('startAt', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${ApiKeyStoreKey}.startAt`
            );
        });
    });
});
