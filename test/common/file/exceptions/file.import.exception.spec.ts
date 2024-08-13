import { HttpStatus } from '@nestjs/common';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';

describe('FileImportException', () => {
    it('should create a HttpException with the correct status code and message', () => {
        const errors: IMessageValidationImportErrorParam[] = [
            {
                row: 1,
                sheetName: 'Sheet1',
                errors: [
                    {
                        property: 'field1',
                        constraints: {
                            isNotEmpty: 'field1 should not be empty',
                        },
                    },
                ],
            },
        ];

        const exception = new FileImportException(errors);

        expect(exception).toBeInstanceOf(FileImportException);
        expect(exception.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(exception.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION
        );
        expect(exception.message).toEqual('file.error.validationDto');
        expect(exception.errors).toEqual(errors);
    });
});
