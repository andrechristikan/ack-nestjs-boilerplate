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
    @Response('app.testHello')
    @Get('/hello')
    async testHello(): Promise<void> {
        return;
    }

    @Response('app.testHello')
    @Get('/error')
    async testError(): Promise<void> {
        throw new BadRequestException({
            statusCode: ENUM_STATUS_CODE_ERROR.TEST_ERROR,
            message: 'app.error.default'
        });
    }

    @Response('app.testHello')
    @Get('/error-data')
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
    @Response('app.testHelloBasicToken')
    @AuthBasicGuard()
    @HttpCode(HttpStatus.CREATED)
    @Get('/hello-basic')
    async testHelloBasicToken(): Promise<void> {
        return;
    }
}
