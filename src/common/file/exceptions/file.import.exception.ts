import { HttpException, HttpStatus } from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';

export class FileImportException extends HttpException {
    constructor(errors: IMessageValidationImportErrorParam[]) {
        super(
            {
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.VALIDATION_DTO,
                message: 'file.error.validationDto',
                errors,
            },
            HttpStatus.UNPROCESSABLE_ENTITY
        );
    }
}
