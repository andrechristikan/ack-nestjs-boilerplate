import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when `deleteDir` reaches its maximum number of list-and-delete iterations before
 * the prefix is empty.
 * @public
 */
export class AwsS3IterationLimitExceededException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3IterationLimitExceeded;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('aws.error.s3IterationLimitExceeded');
    }
}
