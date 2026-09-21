import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

/**
 * Raised when `HelperStringService.fillPattern` meets a `{token}` the caller supplied no value for.
 * @public
 */
export class HelperPatternTokenMissingException extends AppBaseException {
    readonly module = 'helper';
    readonly statusCode = EnumHelperStatusCodeError.patternTokenMissing;
    readonly statusCodeKey = EnumHelperStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(token: string) {
        super('helper.error.patternTokenMissing', {
            messageProperties: { token },
        });
    }
}
