import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponse } from '@common/response/interfaces/response.interface';
import { HelloDoc } from '@module/hello/docs/hello.doc';
import { HelloResponseDto } from '@module/hello/dtos/response/hello.response.dto';

@ApiTags('modules.public.hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/hello',
})
export class HelloPublicController {
    constructor(private readonly helperDateService: HelperDateService) {}

    @HelloDoc()
    @Response('hello.hello', {
        cached: true,
    })
    @Get('/')
    async hello(): Promise<IResponse<HelloResponseDto>> {
        const today = this.helperDateService.create();

        return {
            data: {
                date: today,
                format: this.helperDateService.formatToIso(today),
                timestamp: this.helperDateService.getTimestamp(today),
            },
        };
    }
}
