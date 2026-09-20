import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';

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
    predefinedNotFound: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumRoleStatusCodeError.predefinedNotFound,
        messagePath: 'role.error.predefinedNotFound',
    }),
} as const;
