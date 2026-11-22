import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import type { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';

describe('FileImportException', () => {
    describe('constructor', () => {
        it('declares the file module contract and carries the per-row errors', () => {
            const errors: IMessageValidationImportErrorParam[] = [
                { row: 0, errors: [{ message: 'required' }] },
                { row: 2, errors: [{ message: 'invalid', path: ['email'] }] },
            ];

            const exception = new FileImportException(errors);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.importInvalid,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.importInvalid
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.importInvalid',
            });
            expect(exception.statusCode).toBe(50110);
            expect(exception.errors).toBe(errors);
        });

        it('carries an empty errors array unchanged', () => {
            const exception = new FileImportException([]);

            expect(exception.errors).toEqual([]);
        });
    });
});
