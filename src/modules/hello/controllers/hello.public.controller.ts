import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloPublicDoc } from '@modules/hello/docs/hello.public.doc';
import {
    HelloResponseDto,
    HelloResponseSchema,
} from '@modules/hello/dtos/response/hello.response.dto';
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

    @HelloPublicDoc()
    @Response('hello.hello', {
        cache: true,
        schema: HelloResponseSchema,
    })
    @Get('/')
    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        return this.helloHttpService.hello();
    }
}
