import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { HelloDoc } from 'src/modules/hello/docs/hello.doc';
import { HelloResponseDto } from 'src/modules/hello/dtos/response/hello.response.dto';

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
