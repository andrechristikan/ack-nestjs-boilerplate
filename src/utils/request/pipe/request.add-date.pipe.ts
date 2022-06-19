import { Injectable, mixin, PipeTransform, Type } from '@nestjs/common';
import { CacheService } from 'src/cache/service/cache.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';

export function RequestAddDatePipe(days: number): Type<PipeTransform> {
    @Injectable()
    class MixinRequestAddDatePipe implements PipeTransform {
        constructor(
            private readonly cacheService: CacheService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(value: any) {
            return this.helperDateService.forwardInDays(days, {
                fromDate: this.helperDateService.create({
                    date: value,
                    timezone: await this.cacheService.getTimezone(),
                }),
                timezone: await this.cacheService.getTimezone(),
            });
        }
    }

    return mixin(MixinRequestAddDatePipe);
}
