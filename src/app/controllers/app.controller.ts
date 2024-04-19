import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppHelloDoc } from 'src/app/docs/app.doc';
import { AppHelloDto } from 'src/app/dtos/response/app.hello.dto';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';

@ApiTags('hello')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/',
})
export class AppController {
    constructor(private readonly helperDateService: HelperDateService) {}

    @AppHelloDoc()
    @Response('app.hello')
    @Get('/hello')
    async hello(): Promise<IResponse<AppHelloDto>> {
        const newDate = this.helperDateService.create();

        return {
            data: {
                date: newDate,
                format: this.helperDateService.format(newDate),
                timestamp: this.helperDateService.createTimestamp(newDate),
            },
        };
    }
}
