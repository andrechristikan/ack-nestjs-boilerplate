import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';

vi.mock('@modules/auth/guards/jwt/auth.jwt.access.guard', () => ({
    AuthJwtAccessGuard: vi.fn(),
}));
vi.mock('@modules/auth/guards/jwt/auth.jwt.refresh.guard', () => ({
    AuthJwtRefreshGuard: vi.fn(),
}));

const extractFactory = (
    decorator: () => ParameterDecorator
): ((data: unknown, context: unknown) => unknown) => {
    const target = { constructor: vi.fn() };
    decorator()(target, 'handler', 0);
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        'handler'
    );
    return metadata[Object.keys(metadata)[0]].factory;
};

describe('auth JWT decorators', () => {
    it.each([AuthJwtAccessProtected, AuthJwtRefreshProtected])(
        'registers its authentication guard',
        decorator => {
            const handler = vi.fn();
            decorator()({}, 'handler', { value: handler });
            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(
                1
            );
        }
    );

    it('reads the complete JWT payload and a requested field', () => {
        const user = { sub: 'user-id', role: 'user' };
        const context = {
            switchToHttp: () => ({ getRequest: () => ({ user }) }),
        };
        const factory = extractFactory(() => AuthJwtPayload());
        expect(factory(undefined, context)).toBe(user);
        expect(factory(null, context)).toBe(user);
        expect(factory('sub', context)).toBe('user-id');
    });

    it.each([undefined, null])('rejects a missing JWT payload', value => {
        const context = {
            switchToHttp: () => ({ getRequest: () => ({ user: value }) }),
        };
        const factory = extractFactory(() => AuthJwtPayload());
        expect(() => factory(undefined, context)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([undefined, null])('rejects a missing JWT payload field', value => {
        const context = {
            switchToHttp: () => ({
                getRequest: () => ({ user: { sub: value } }),
            }),
        };
        const factory = extractFactory(() => AuthJwtPayload());
        expect(() => factory('sub', context)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([
        ['Bearer token', 'token'],
        ['Bearer', undefined],
        [undefined, undefined],
    ])('extracts the raw authorization token', (authorization, expected) => {
        const context = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { authorization } }),
            }),
        };
        const factory = extractFactory(() => AuthJwtToken());
        expect(factory(undefined, context)).toBe(expected);
    });
});
