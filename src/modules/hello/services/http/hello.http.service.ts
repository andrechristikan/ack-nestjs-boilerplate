import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { HelloUtil } from '@modules/hello/utils/hello.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloHttpService {
    constructor(
        private readonly helloUtil: HelloUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        const date = this.helperDateService.create();
        const dateIso = this.helperDateService.formatToIso(date);
        const dateTimestamp = this.helperDateService.getTimestamp(date);

        const app = this.helloUtil.getApp();
        const message = this.helloUtil.getMessage();

        return {
            data: {
                date: {
                    iso: dateIso,
                    timestamp: dateTimestamp,
                },
                app,
                message,
            },
        };
    }
}
