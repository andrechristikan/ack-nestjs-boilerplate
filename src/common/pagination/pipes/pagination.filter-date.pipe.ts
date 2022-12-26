import { Injectable, mixin, Type } from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterDateOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterDatePipe(
    options?: IPaginationFilterDateOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            private readonly paginationService: PaginationService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(
            value: string,
            { data: field }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!value) {
                return undefined;
            }

            let date: Date = this.helperDateService.create(value);

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

            return filter;
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
