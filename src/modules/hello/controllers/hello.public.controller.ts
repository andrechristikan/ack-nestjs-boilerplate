import { Doc } from '@common/doc/decorators/doc.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseSchema } from '@modules/hello/dtos/response/hello.response.dto';
import type { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { HelloHttpService } from '@modules/hello/services/hello.http.service';
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/hello',
})
export class HelloPublicController {
    constructor(private readonly helloHttpService: HelloHttpService) {}

    @Doc({ summary: 'hello test api' })
    @Response('hello.hello', {
        cache: true,
        schema: HelloResponseSchema,
    })
    @Get('/')
    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        return this.helloHttpService.hello();
    }
}
