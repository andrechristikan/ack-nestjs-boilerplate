import { HttpStatus } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Carries Standard Schema validation issues to the global filter as a 422.
 */
export class RequestValidationException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.validation;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly issues: readonly StandardSchemaV1.Issue[];

    constructor(issues: readonly StandardSchemaV1.Issue[]) {
        super('request.error.validation');

        this.issues = issues;
    }
}
