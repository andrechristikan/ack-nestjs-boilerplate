import { HelperDateService } from '@common/helper/services/helper.date.service';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { IHelloHttpService } from '@modules/hello/interfaces/hello.http.service.interface';
import { HelloService } from '@modules/hello/services/hello.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloHttpService implements IHelloHttpService {
    constructor(
        private readonly helloService: HelloService,
        private readonly helperDateService: HelperDateService
    ) {}

    async hello(): Promise<IResponseReturn<HelloResponseDto>> {
        const date = this.helperDateService.create();
        const dateIso = this.helperDateService.formatToIso(date);
        const dateTimestamp = this.helperDateService.getTimestamp(date);

        return {
            data: {
                date: {
                    date,
                    iso: dateIso,
                    timestamp: dateTimestamp,
                },
                app: this.helloService.getApp(),
                message: this.helloService.getMessage(),
            },
        };
    }
}
