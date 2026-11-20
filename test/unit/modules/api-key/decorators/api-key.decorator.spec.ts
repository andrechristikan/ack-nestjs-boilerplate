import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext, Type } from '@nestjs/common';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    ApiKeyContext,
    ApiKeyProtected,
    ApiKeySystemProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    ApiKeyContextStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import {
    buildApiKeyContext,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';

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

        it('documents the api key error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeySystemProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                    messagePath: 'apiKey.error.xApiKey.required',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                    messagePath: 'apiKey.error.xApiKey.invalid',
                },
                {
                    httpStatus: HttpStatus.BAD_REQUEST,
                    statusCode: EnumApiKeyStatusCodeError.expired,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                    messagePath: 'apiKey.error.xApiKey.forbidden',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.guardMissing,
                    messagePath: 'apiKey.error.guardMissing',
                },
            ]);
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

        it('documents the api key error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            ApiKeyProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                    messagePath: 'apiKey.error.xApiKey.required',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                    messagePath: 'apiKey.error.xApiKey.invalid',
                },
                {
                    httpStatus: HttpStatus.BAD_REQUEST,
                    statusCode: EnumApiKeyStatusCodeError.expired,
                    messagePath: 'apiKey.error.expired',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                    messagePath: 'apiKey.error.xApiKey.forbidden',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumApiKeyStatusCodeError.guardMissing,
                    messagePath: 'apiKey.error.guardMissing',
                },
            ]);
        });
    });

    describe('ApiKeyContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        ApiKeyContext()(target, 'apiKeyContext', 0);
        const factory = getParamDecoratorFactory(target, 'apiKeyContext');

        beforeEach(() => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        it('throws RequestContextMissingException naming the key when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, ApiKeyContextStoreKey);
        });

        it('returns the stored api key context', () => {
            const apiKeyContext = buildApiKeyContext();
            clsService.get.mockReturnValue(apiKeyContext);

            expect(factory(undefined, executionContext)).toBe(apiKeyContext);
            expect(clsService.get).toHaveBeenCalledWith(ApiKeyContextStoreKey);
        });
    });
});
