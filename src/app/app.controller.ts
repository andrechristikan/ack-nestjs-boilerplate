import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException
} from '@nestjs/common';
import { AuthBasicGuard } from 'src/auth/auth.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Response } from 'src/response/response.decorator';
@Controller('/test')
export class AppController {
    @Get('/hello')
    @Response('app.testHello')
    async testHello(): Promise<void> {
        return;
    }

    @Get('/error')
    @Response('app.testHello')
    async testError(): Promise<void> {
        throw new BadRequestException({
            statusCode: ENUM_STATUS_CODE_ERROR.TEST_ERROR,
            message: 'app.error.default'
        });
    }

    @Get('/error-data')
    @Response('app.testHello')
    async testErrorData(): Promise<void> {
        throw new InternalServerErrorException({
            statusCode: ENUM_STATUS_CODE_ERROR.TEST_ERROR,
            message: 'app.testErrorData',
            errors: [
                {
                    message: 'app.testErrors',
                    property: 'test'
                }
            ]
        });
    }

    // HTTP STATUS MANIPULATE TO 201
    @Get('/hello-basic')
    @AuthBasicGuard()
    @HttpCode(HttpStatus.CREATED)
    @Response('app.testHelloBasicToken')
    async testHelloBasicToken(): Promise<void> {
        return;
    }
}
