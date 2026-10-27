import 'reflect-metadata';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { ClsServiceManager } from 'nestjs-cls';
import type { ClsService } from 'nestjs-cls';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: {
        getClsService: vi.fn(),
    },
}));

vi.mock('@modules/user/guards/user.guard', () => ({
    UserGuard: vi.fn(),
}));

describe('UserProtected', () => {
    it('applies the user guard and sets the verified metadata, defaulting to true', () => {
        const target = {};
        const handler = vi.fn();
        const handlerNotVerified = vi.fn();
        UserProtected()(target, 'handler', { value: handler });
        UserProtected(false)(target, 'handlerNotVerified', {
            value: handlerNotVerified,
        });

        expect(Reflect.getMetadata(UserGuardIsVerifiedMetaKey, handler)).toBe(
            true
        );
        expect(
            Reflect.getMetadata(UserGuardIsVerifiedMetaKey, handlerNotVerified)
        ).toBe(false);
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(1);
    });
});

describe('UserCurrent', () => {
    /** Extracts the raw factory registered by `createParamDecorator` for direct unit testing. */
    const extractFactory = (): ((data: unknown, ctx: unknown) => unknown) => {
        const target = { constructor: vi.fn() };
        UserCurrent()(target, 'handler', 0);

        const args = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            target.constructor,
            'handler'
        );
        const key = Object.keys(args)[0];

        return args[key].factory;
    };

    it('returns the user stored by UserGuard', () => {
        const user = { id: 'user-id', name: null };
        const clsService: MockProxy<ClsService> = mock<ClsService>();
        clsService.get.mockReturnValue(user);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        const factory = extractFactory();

        expect(factory(undefined, {})).toBe(user);
        expect(factory(null, {})).toBe(user);
        expect(factory('id', {})).toBe('user-id');
        expect(clsService.get).toHaveBeenCalledWith(UserStoreKey);
    });

    it('rejects a missing user context', () => {
        const clsService: MockProxy<ClsService> = mock<ClsService>();
        clsService.get.mockReturnValue(undefined);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        const factory = extractFactory();

        expect(() => factory(undefined, {})).toThrow(
            RequestContextMissingException
        );
    });

    it('rejects a null user context', () => {
        const clsService: MockProxy<ClsService> = mock<ClsService>();
        clsService.get.mockReturnValue(null);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        expect(() => extractFactory()(undefined, {})).toThrow(
            RequestContextMissingException
        );
    });

    it.each([undefined, null])('rejects a missing selected field', value => {
        const clsService: MockProxy<ClsService> = mock<ClsService>();
        clsService.get.mockReturnValue({ id: value });
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        expect(() => extractFactory()('id', {})).toThrow(
            RequestContextMissingException
        );
    });
});
