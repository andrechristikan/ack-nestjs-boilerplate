import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRoleType } from '@generated/prisma-client/client';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IRoleRank } from '@modules/role/interfaces/role.interface';

/**
 * Route metadata key holding the role types `@RoleProtected` requires.
 * @public
 */
export const RoleRequiredMetaKey = 'RoleRequiredMetaKey';

/**
 * Rank of each role type; a higher number outranks a lower one.
 * @public
 */
export const RoleRank: IRoleRank = {
    [EnumRoleType.superAdmin]: 3,
    [EnumRoleType.admin]: 2,
    [EnumRoleType.user]: 1,
};

/**
 * Error entries `@RoleProtected` documents: the role forbidden error and the missing user store.
 * @public
 */
export const RoleProtectedDocErrors: IDocResponseEntry[] = [
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
];
