import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { EnumApiKeyType } from '@generated/prisma-client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import {
    ApiKeyPayload,
    ApiKeyProtected,
    ApiKeySystemProtected,
} from '@modules/api-key/decorators/api-key.decorator';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/api-key/guards/x-api-key/api-key.x-api-key.guard', () => ({
    ApiKeyXApiKeyGuard: vi.fn(),
}));
vi.mock(
    '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard',
    () => ({
        ApiKeyXApiKeyTypeGuard: vi.fn(),
    })
);

const extractFactory = (): ((data: unknown) => unknown) => {
    const target = { constructor: vi.fn() };
    ApiKeyPayload()(target, 'handler', 0);
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        'handler'
    );
    return metadata[Object.keys(metadata)[0]].factory;
};

describe('API key decorators', () => {
    it.each([
        [ApiKeyProtected, EnumApiKeyType.default],
        [ApiKeySystemProtected, EnumApiKeyType.system],
    ] as const)(
        'registers guards and API key type metadata',
        (decorator, type) => {
            const handler = vi.fn();
            decorator()({}, 'handler', { value: handler });
            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(
                2
            );
            expect(Reflect.getMetadata(ApiKeyXTypeMetaKey, handler)).toEqual([
                type,
            ]);
        }
    );

    it('reads the complete API key and a requested field', () => {
        const apiKey = { id: 'key-id', name: 'key' };
        const cls = mock<ClsService>();
        cls.get.mockReturnValue(apiKey);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        const factory = extractFactory();
        expect(factory(undefined)).toBe(apiKey);
        expect(factory(null)).toBe(apiKey);
        expect(factory('id')).toBe('key-id');
        expect(cls.get).toHaveBeenCalledWith(ApiKeyStoreKey);
    });

    it.each([undefined, null])('rejects missing API key context', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue(value);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()(undefined)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([undefined, null])('rejects a missing API key field', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue({ id: value });
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()('id')).toThrow(
            RequestContextMissingException
        );
    });
});
