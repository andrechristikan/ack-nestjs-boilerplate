import { HttpException, HttpStatus } from '@nestjs/common';

// in case if we want to return success, with custom status code
export class SuccessException extends HttpException {
    constructor(
        data: Record<string, any> | string,
        httpCode?:
            | HttpStatus.OK
            | HttpStatus.CREATED
            | HttpStatus.ACCEPTED
            | HttpStatus.NON_AUTHORITATIVE_INFORMATION
            | HttpStatus.NO_CONTENT
            | HttpStatus.RESET_CONTENT
            | HttpStatus.PARTIAL_CONTENT
    ) {
        super(data, httpCode || HttpStatus.OK);
    }
}
