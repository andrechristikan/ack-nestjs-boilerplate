import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';

describe('AnalyticInvalidDateRangeException', () => {
    describe('constructor', () => {
        it('declares the analytic module contract for an inverted date range', () => {
            const exception = new AnalyticInvalidDateRangeException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'analytic',
                statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
                statusCodeKey:
                    EnumAnalyticStatusCodeError[
                        EnumAnalyticStatusCodeError.invalidDateRange
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'analytic.error.invalidDateRange',
            });
        });
    });
});
