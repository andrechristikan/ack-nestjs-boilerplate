import { HttpStatus } from '@nestjs/common';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';

describe('AnalyticInvalidDateRangeException', () => {
    it('exposes module, status code, key, http status and message path', () => {
        const exception = new AnalyticInvalidDateRangeException();

        expect(exception.module).toBe('analytic');
        expect(exception.statusCode).toBe(
            EnumAnalyticStatusCodeError.invalidDateRange
        );
        expect(exception.statusCodeKey).toBe('invalidDateRange');
        expect(exception.httpStatus).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.messagePath).toBe('analytic.error.invalidDateRange');
    });
});
