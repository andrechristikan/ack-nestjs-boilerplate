import { HttpStatus } from '@nestjs/common';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';

describe('RequestValidationException', () => {
    let exception: RequestValidationException;
    const errors = [
        {
            target: {
                email: 'admin-mail.com',
                password: 'aaAA@@123444',
                rememberMe: true,
            },
            value: 'admin-mail.com',
            property: 'email',
            children: [],
            constraints: { isEmail: 'email must be an email' },
        },
    ];

    beforeEach(() => {
        exception = new RequestValidationException(errors);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(exception).toBeDefined();
    });

    it('should be RequestValidationException', () => {
        expect(exception).toBeInstanceOf(RequestValidationException);
        expect(exception.message).toEqual('request.validation');
        expect(exception.httpStatus).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(exception.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION
        );
        expect(exception.errors).toEqual(errors);
    });
});
