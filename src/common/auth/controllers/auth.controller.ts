import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { User } from 'src/common/auth/decorators/auth.decorator';
import { AuthJwtGuard } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthGetInfoDoc } from 'src/common/auth/docs/auth.doc';
import { AuthInfoSerialization } from 'src/common/auth/serializations/auth.info.serialization';
import {
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';

@ApiTags('auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthController {
    @AuthGetInfoDoc()
    @Response('auth.info', { classSerialization: AuthInfoSerialization })
    @AuthJwtGuard()
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('/info')
    async info(@User() user: Record<string, any>): Promise<IResponse> {
        return user;
    }
}
