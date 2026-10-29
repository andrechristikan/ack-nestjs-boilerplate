import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumRoleType } from '@generated/prisma-client/client';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRoleRank } from '@modules/role/interfaces/role.interface';

/**
 * Route metadata key holding the role types `@RoleProtected` requires.
 * @public
 */
export const RoleRequiredMetaKey = 'RoleRequiredMetaKey';

/**
 * Role guard error kit for `@RoleProtected`.
 * @public
 */
export const DocRoleErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumRoleStatusCodeError.forbidden,
        messagePath: 'role.error.forbidden',
    }),
} as const;

/**
 * Rank of each role type; a higher number outranks a lower one.
 * @public
 */
export const RoleRank: IRoleRank = {
    [EnumRoleType.superAdmin]: 3,
    [EnumRoleType.admin]: 2,
    [EnumRoleType.user]: 1,
};
