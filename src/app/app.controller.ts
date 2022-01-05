import { Controller, Get } from '@nestjs/common';
import {
    AuthBasicGuard,
    AuthJwtGuard,
    AuthJwtRefreshGuard
} from 'src/auth/auth.decorator';
import { Response } from 'src/response/response.decorator';
@Controller('/test')
export class AppController {
    @Response('app.hello')
    @Get('/hello')
    async hello(): Promise<void> {
        return;
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
