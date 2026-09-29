import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when an S3 key, path, source, or destination fails the service's shape guard: a
 * leading `/` on the key-taking operations, plus `..` or `//` on `putItem`.
 * @public
 */
export class AwsS3KeyInvalidException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.s3KeyInvalid;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('aws.error.s3KeyInvalid');
    }
}
