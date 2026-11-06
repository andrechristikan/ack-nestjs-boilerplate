import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';

/** @public */
export class RoleImmutableException extends AppBaseException {
    readonly module = 'role';
    readonly statusCode = EnumRoleStatusCodeError.immutable;
    readonly statusCodeKey = EnumRoleStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('role.error.immutable');
    }
}
