import { HttpStatus } from '@nestjs/common';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import { UserGuardIsVerifiedMetaKey } from '@modules/user/constants/user.constant';
import { UserProtected } from '@modules/user/decorators/user.decorator';
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
});
