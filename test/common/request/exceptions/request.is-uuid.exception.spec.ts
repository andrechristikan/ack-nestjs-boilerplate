import { describe, expect, it } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestIsUuidException } from '@common/request/exceptions/request.is-uuid.exception';

describe('RequestIsUuidException', () => {
    it('exposes the request validation error contract', () => {
        const exception = new RequestIsUuidException('userId');

        expect(exception.module).toBe('request');
        expect(exception.statusCode).toBe(
            EnumRequestStatusCodeError.validation
        );
        expect(exception.statusCodeKey).toBe('validation');
        expect(exception.httpStatus).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.messagePath).toBe('request.error.isUuid');
    });
});
