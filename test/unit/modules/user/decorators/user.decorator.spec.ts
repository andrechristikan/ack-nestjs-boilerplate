import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext, Type } from '@nestjs/common';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import {
    UserContextStoreKey,
    UserGuardIsVerifiedMetaKey,
} from '@modules/user/constants/user.constant';
import {
    buildUser,
    buildUserContext,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserGuard } from '@modules/user/guards/user.guard';

describe('user.decorator', () => {
    describe('UserProtected', () => {
        it('mounts UserGuard and sets the verified flag to true by default', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            UserProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([UserGuard]);
            expect(
                Reflect.getMetadata(
                    UserGuardIsVerifiedMetaKey,
                    descriptor.value
                )
            ).toBe(true);
        });

        it('sets the verified flag to false when passed false', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            UserProtected(false)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    UserGuardIsVerifiedMetaKey,
                    descriptor.value
                )
            ).toBe(false);
        });

        it('documents the user status errors and the missing jwt payload, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            UserProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumUserStatusCodeError.accountNotFound,
                    messagePath: 'user.error.accountNotFound',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumUserStatusCodeError.blockedForbidden,
                    messagePath: 'user.error.blocked',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumUserStatusCodeError.inactiveForbidden,
                    messagePath: 'user.error.inactive',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumUserStatusCodeError.passwordExpired,
                    messagePath: 'user.error.passwordExpired',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumUserStatusCodeError.emailNotVerified,
                    messagePath: 'user.error.emailNotVerified',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.jwtGuardMissing,
                    messagePath: 'auth.error.jwtGuardMissing',
                },
            ]);
        });
    });

    describe('UserContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        UserContext()(target, 'userContext', 0);
        const factory = getParamDecoratorFactory(target, 'userContext');

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

            expectRequestContextMissingWithKey(thrown, UserContextStoreKey);
        });

        it('returns the stored user context', () => {
            const userContext = buildUserContext(
                buildUser('user-1', 'jane@example.com')
            );
            clsService.get.mockReturnValue(userContext);

            expect(factory(undefined, executionContext)).toBe(userContext);
            expect(clsService.get).toHaveBeenCalledWith(UserContextStoreKey);
        });
    });
});
