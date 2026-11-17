import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumOutboxStatusCodeError } from '@common/outbox/enums/outbox.status-code.enum';
import { OutboxTransactionMissingException } from '@common/outbox/exceptions/outbox.transaction-missing.exception';

describe('OutboxTransactionMissingException', () => {
    describe('constructor', () => {
        it('declares the outbox module contract', () => {
            const exception = new OutboxTransactionMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'outbox',
                statusCode: 52500,
                statusCodeKey: 'transactionMissing',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'outbox.error.transactionMissing',
            });
            expect(EnumOutboxStatusCodeError[exception.statusCode]).toBe(
                'transactionMissing'
            );
        });
    });
});
