import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';

/**
 * Raised when the caller role type is not one the route allows.
 * @public
 */
export class RoleForbiddenException extends AppBaseException {
    readonly module = 'role';
    readonly statusCode = EnumRoleStatusCodeError.forbidden;
    readonly statusCodeKey = EnumRoleStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('role.error.forbidden');
    }
}
