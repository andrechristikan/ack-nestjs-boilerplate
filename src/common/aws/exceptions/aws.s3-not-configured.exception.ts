import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when a request needs S3 and the S3 integration is not configured.
 * @public
 */
export class AwsS3NotConfiguredException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3NotConfigured;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('aws.error.s3NotConfigured');
    }
}
