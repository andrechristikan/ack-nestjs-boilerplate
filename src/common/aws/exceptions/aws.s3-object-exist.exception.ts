import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/** @public */
export class AwsS3ObjectExistException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3ObjectExist;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('aws.error.s3ObjectExist');
    }
}
