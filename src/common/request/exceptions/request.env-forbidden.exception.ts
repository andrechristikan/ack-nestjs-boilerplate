import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a route is called outside the environments it allows.
 * @public
 */
export class RequestEnvForbiddenException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.envForbidden;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('http.clientError.forbidden');
    }
}
