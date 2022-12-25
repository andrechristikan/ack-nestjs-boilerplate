import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterDateOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterDatePipe(
    field: string,
    options?: IPaginationFilterDateOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            private readonly paginationService: PaginationService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (!value[field]) {
                return undefined;
            }

            let date: Date = this.helperDateService.create(value[field]);

            if (
                options?.time ===
                ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS.END_OF_DAY
            ) {
                date = this.helperDateService.endOfDay(date);
            } else if (
                options?.time ===
                ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS.START_OF_DAY
            ) {
                date = this.helperDateService.startOfDay(date);
            }

            const filter: Record<string, any> =
                this.paginationService.filterDate(field, date);

            return {
                ...value,
                [field]: filter,
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
