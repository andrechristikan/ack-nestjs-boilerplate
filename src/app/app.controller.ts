import { Controller, Get } from '@nestjs/common';
import { AuthBasicGuard } from 'src/auth/auth.decorator';
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
}
