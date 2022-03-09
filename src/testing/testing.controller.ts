import {
    BadRequestException,
    Controller,
    Get,
    VERSION_NEUTRAL,
} from '@nestjs/common';

import { Response } from 'src/response/response.decorator';

@Controller({
    version: VERSION_NEUTRAL,
})
export class TestingController {
    @Response('test.hello')
    @Get('/hello')
    async hello(): Promise<void> {
        throw new BadRequestException('test.hello');
        return;
    }
}
