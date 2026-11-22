import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';

describe('SessionRevokedException', () => {
    describe('constructor', () => {
        it('declares the session module contract for a missing or mismatched session', () => {
            const exception = new SessionRevokedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.revoked,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.revoked
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'session.error.revoked',
            });
        });
    });
});
