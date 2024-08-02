import { HttpException, HttpStatus } from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';

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

        expect(exception).toBeInstanceOf(HttpException);
        expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(exception.getResponse()).toEqual({
            statusCode: ENUM_FILE_STATUS_CODE_ERROR.VALIDATION_DTO,
            message: 'file.error.validationDto',
            errors,
        });
    });
});
