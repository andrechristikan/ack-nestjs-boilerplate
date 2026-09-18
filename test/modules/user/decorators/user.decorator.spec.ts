import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';
import 'reflect-metadata';
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
import { ClsServiceManager } from 'nestjs-cls';
import type { ClsService } from 'nestjs-cls';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: {
        getClsService: vi.fn(),
    },
}));

vi.mock('@modules/user/guards/user.guard', () => ({
    UserGuard: class UserGuard {},
}));

describe('UserProtected', () => {
    it('applies the user guard and sets the verified metadata, defaulting to true', () => {
        class TestController {
            @UserProtected()
            handler(): void {}

            @UserProtected(false)
            handlerNotVerified(): void {}
        }

        expect(
            Reflect.getMetadata(
                UserGuardIsVerifiedMetaKey,
                TestController.prototype.handler
            )
        ).toBe(true);
        expect(
            Reflect.getMetadata(
                UserGuardIsVerifiedMetaKey,
                TestController.prototype.handlerNotVerified
            )
        ).toBe(false);
        expect(
            Reflect.getMetadata(
                GUARDS_METADATA,
                TestController.prototype.handler
            )
        ).toHaveLength(1);
    });
});

describe('UserCurrent', () => {
    /** Extracts the raw factory registered by `createParamDecorator` for direct unit testing. */
    const extractFactory = (): ((data: unknown, ctx: unknown) => unknown) => {
        class TestController {
            handler(@UserCurrent() _user: unknown): void {}
        }

        const args = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            TestController,
            'handler'
        );
        const key = Object.keys(args)[0];

        return args[key].factory;
    };

    it('returns the user stored by UserGuard', () => {
        const user = { id: 'user-id' };
        const get = vi.fn(() => user);
        const clsService = createMock<ClsService>();
        clsService.get = get;
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        const factory = extractFactory();

        expect(factory(undefined, {})).toBe(user);
        expect(get).toHaveBeenCalledWith(UserStoreKey);
    });

    it('returns undefined when no user was stored', () => {
        const clsService = createMock<ClsService>();
        clsService.get.mockImplementation(() => undefined as never);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(clsService);

        const factory = extractFactory();

        expect(factory(undefined, {})).toBeUndefined();
    });
});
