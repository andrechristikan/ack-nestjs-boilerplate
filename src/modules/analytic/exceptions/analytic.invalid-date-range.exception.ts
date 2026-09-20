import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';

/**
 * Raised when an analytics date range starts after it ends.
 * @public
 */
export class AnalyticInvalidDateRangeException extends AppBaseException {
    readonly module = 'analytic';
    readonly statusCode = EnumAnalyticStatusCodeError.invalidDateRange;
    readonly statusCodeKey = EnumAnalyticStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('analytic.error.invalidDateRange');
    }
}
