import { Injectable, mixin, PipeTransform, Type } from '@nestjs/common';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

export function RequestAddDatePipe(days: number): Type<PipeTransform> {
    @Injectable()
    class MixinRequestAddDatePipe implements PipeTransform {
        constructor(private readonly helperDateService: HelperDateService) {}

        async transform(value: any) {
            return this.helperDateService.forwardInDays(days, {
                fromDate: this.helperDateService.create({
                    date: value,
                }),
            });
        }
    }

    return mixin(MixinRequestAddDatePipe);
}
