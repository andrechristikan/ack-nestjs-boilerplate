import {
    BadRequestException,
    Controller,
    Get,
    InternalServerErrorException
} from '@nestjs/common';
import {
    AuthBasicGuard,
    AuthJwtGuard,
    AuthJwtRefreshGuard
} from 'src/auth/auth.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Response } from 'src/response/response.decorator';
@Controller('/test')
export class AppController {
    @Response('app.hello')
    @Get('/hello')
    async hello(): Promise<void> {
        return;
    }
    @Response('app.error')
    @Get('/error')
    async error(): Promise<void> {
        throw new BadRequestException({
            statusCode: ENUM_STATUS_CODE_ERROR.TEST_ERROR,
            message: 'app.error.default'
        });
    }
    @Response('app.errorData')
    @Get('/error-data')
    async errorData(): Promise<void> {
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
    @Response('app.basic')
    @AuthBasicGuard()
    @Get('/basic')
    async basic(): Promise<void> {
        return;
    }
    @Response('app.auth')
    @AuthJwtGuard()
    @Get('/auth')
    async auth(): Promise<void> {
        return;
    }
    @Response('app.refresh')
    @AuthJwtRefreshGuard()
    @Get('/refresh')
    async refresh(): Promise<void> {
        return;
    }
}
