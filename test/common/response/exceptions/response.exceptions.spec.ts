import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { ResponsePaginationShapeInvalidException } from '@common/response/exceptions/response.pagination-shape-invalid.exception';
import { ResponsePaginationTypeInvalidException } from '@common/response/exceptions/response.pagination-type-invalid.exception';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';

describe('Response exceptions', () => {
    it.each([
        [
            new ResponseSerializationException(),
            EnumResponseStatusCodeError.serialization,
            'response.error.serialization',
        ],
        [
            new ResponsePaginationShapeInvalidException(),
            EnumResponseStatusCodeError.paginationShapeInvalid,
            'response.error.paginationShapeInvalid',
        ],
        [
            new ResponsePaginationTypeInvalidException(),
            EnumResponseStatusCodeError.paginationTypeInvalid,
            'response.error.paginationTypeInvalid',
        ],
    ])(
        'maps %s to the shared response error contract',
        (exception, code, path) => {
            expect(exception).toMatchObject({
                module: 'response',
                statusCode: code,
                statusCodeKey: EnumResponseStatusCodeError[code],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: path,
            });
        }
    );
});
