import { HttpStatus } from '@nestjs/common';
import { IAppBaseExceptionOptions } from '@app/interfaces/app.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';

/**
 * Raised when a handler payload does not match the schema the route declares.
 */
export class ResponseSerializationException extends AppBaseException {
    readonly module = 'response';
    readonly statusCode = EnumResponseStatusCodeError.serialization;
    readonly statusCodeKey = EnumResponseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(options?: IAppBaseExceptionOptions) {
        super('response.error.serialization', options);
    }
}
