import { HttpStatus } from '@nestjs/common';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import {
    ApiKeyProtected,
    ApiKeySystemProtected,
} from '@modules/api-key/decorators/api-key.decorator';
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
});
