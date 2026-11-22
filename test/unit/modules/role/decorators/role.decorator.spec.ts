import { HttpStatus } from '@nestjs/common';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { RoleGuard } from '@modules/role/guards/role.guard';

import { RoleProtectedEmptyException } from '@modules/role/exceptions/role.protected-empty.exception';

describe('role.decorator', () => {
    describe('RoleProtected', () => {
        it('mounts RoleGuard and the required role types on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RoleProtected(EnumRoleType.admin, EnumRoleType.user)(
                target,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RoleGuard]);
            expect(
                Reflect.getMetadata(RoleRequiredMetaKey, descriptor.value)
            ).toEqual([EnumRoleType.admin, EnumRoleType.user]);
        });

        it('documents the role forbidden error and the missing user store, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RoleProtected(EnumRoleType.admin)(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumRoleStatusCodeError.forbidden,
                    messagePath: 'role.error.forbidden',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumUserStatusCodeError.guardMissing,
                    messagePath: 'user.error.guardMissing',
                },
            ]);
        });

        it('throws at evaluation when no role is given', () => {
            expect(() => RoleProtected()).toThrow(RoleProtectedEmptyException);
            expect(() => RoleProtected()).toThrow(
                'RoleProtected needs at least one role'
            );
        });
    });
});
