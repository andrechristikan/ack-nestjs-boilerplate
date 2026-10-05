import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';

describe('SessionNotFoundException', () => {
    describe('constructor', () => {
        it('declares the session module contract for a missing or inactive session', () => {
            const exception = new SessionNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'session.error.notFound',
            });
        });
    });
});
