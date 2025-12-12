import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloService } from '@modules/hello/services/hello.service';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { HelloPublicDoc } from '@modules/hello/docs/hello.public.doc';

@ApiTags('modules.public.hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/hello',
})
export class HelloPublicController {
    constructor(private readonly helloService: HelloService) {}

    @HelloPublicDoc()
    @Response('hello.hello', {
        cache: true,
    })
    @Get('/')
    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        return this.helloService.hello();
    }
}
