import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when a multipart upload requests more parts than `AwsS3MaxPartNumber` allows.
 * @public
 */
export class AwsS3MaxPartNumberExceededException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3MaxPartNumberExceeded;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('aws.error.s3MaxPartNumberExceeded');
    }
}
