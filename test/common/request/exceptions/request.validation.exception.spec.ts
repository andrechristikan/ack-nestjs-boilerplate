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
        const status = exception.getStatus();
        const response = exception.getResponse() as unknown as any;

        expect(exception).toBeInstanceOf(RequestValidationException);
        expect(exception.message).toEqual('request.validation');
        expect(status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION_ERROR
        );
        expect(response.errors).toEqual(errors);
    });
});
