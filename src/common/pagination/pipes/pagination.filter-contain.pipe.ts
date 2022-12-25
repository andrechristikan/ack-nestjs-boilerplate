import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_PAGINATION_FILTER_CASE_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterStringOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterContainPipe(
    field: string,
    options?: IPaginationFilterStringOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterContainPipe implements PipeTransform {
        constructor(
            private readonly paginationService: PaginationService,
            private readonly helperNumberService: HelperNumberService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (!value[field]) {
                return undefined;
            }

            if (
                options?.case === ENUM_PAGINATION_FILTER_CASE_OPTIONS.UPPERCASE
            ) {
                value[field] = value[field].toUpperCase();
            } else if (
                options?.case === ENUM_PAGINATION_FILTER_CASE_OPTIONS.LOWERCASE
            ) {
                value[field] = value[field].toUpperCase();
            }

            if (options?.trim) {
                value[field] = value[field].trim();
            }

            if (options?.isNumber) {
                value[field] = this.helperNumberService.check(value[field])
                    ? this.helperNumberService.create(value[field])
                    : value[field];
            }

            const filter: Record<string, any> =
                this.paginationService.filterContain(field, value[field]);

            return {
                ...value,
                [field]: filter,
            };
        }
    }

    return mixin(MixinPaginationFilterContainPipe);
}
