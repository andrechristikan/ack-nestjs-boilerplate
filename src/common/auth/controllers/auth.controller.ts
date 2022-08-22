import { Controller, Get } from '@nestjs/common';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { User } from '../decorators/auth.decorator';
import { AuthJwtGuard } from '../decorators/auth.jwt.decorator';

@Controller({
    version: '1',
    path: '/auth',
})
export class AuthController {
    @Response('auth.info')
    @AuthJwtGuard()
    @Get('/info')
    async info(@User() user: Record<string, any>): Promise<IResponse> {
        return user;
    }
}
