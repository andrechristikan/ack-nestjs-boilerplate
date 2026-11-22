import { Doc } from '@common/doc/decorators/doc.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseSchema } from '@modules/hello/dtos/response/hello.response.dto';
import type { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { HelloUseCase } from '@modules/hello/use-cases/hello.use-case';
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/hello',
})
export class HelloPublicController {
    constructor(private readonly helloUseCase: HelloUseCase) {}

    @Doc({ summary: 'hello test api' })
    @Response('hello.hello', {
        schema: HelloResponseSchema,
    })
    @Get('/')
    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        return this.helloUseCase.execute();
    }
}
