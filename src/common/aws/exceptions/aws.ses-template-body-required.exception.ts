import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';

/**
 * Raised when an SES template is created or updated with neither an HTML nor a plain-text
 * body.
 * @public
 */
export class AwsSesTemplateBodyRequiredException extends AppBaseException {
    readonly module = 'aws';
    readonly statusCode = EnumAwsStatusCodeError.sesTemplateBodyRequired;
    readonly statusCodeKey = EnumAwsStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('aws.error.sesTemplateBodyRequired');
    }
}
