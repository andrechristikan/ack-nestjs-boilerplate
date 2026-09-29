import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when the S3 bucket configuration for the requested accessibility level is missing.
 * @public
 */
export class AwsS3ConfigMissingException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3ConfigMissing;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('aws.error.s3ConfigMissing');
    }
}
