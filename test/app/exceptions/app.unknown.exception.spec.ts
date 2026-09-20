import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';

describe('AppUnknownException', () => {
    it('maps an unknown failure to the shared internal error contract', () => {
        const rawError = new Error('database unavailable');

        const exception = new AppUnknownException(rawError);

        expect(exception).toMatchObject({
            module: 'app',
            statusCode: EnumAppStatusCodeError.unknown,
            statusCodeKey:
                EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            rawError,
        });
    });
});
