import { HelperService } from '@common/helper/services/helper.service';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
    constructor(private readonly helperService: HelperService) {}

    hello(): IResponseReturn<HelloResponseDto> {
        const today = this.helperService.dateCreate();

        return {
            data: {
                date: today,
                format: this.helperService.dateFormatToIso(today),
                timestamp: this.helperService.dateGetTimestamp(today),
            },
        };
    }
}
