import { Injectable, mixin, Type } from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { ENUM_PAGINATION_FILTER_CASE_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterStringContainOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterContainPipe(
    options?: IPaginationFilterStringContainOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterContainPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: string,
            { data: field }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!value) {
                return undefined;
            }

            if (
                options?.case === ENUM_PAGINATION_FILTER_CASE_OPTIONS.UPPERCASE
            ) {
                value = value.toUpperCase();
            } else if (
                options?.case === ENUM_PAGINATION_FILTER_CASE_OPTIONS.LOWERCASE
            ) {
                value = value.toUpperCase();
            }

            if (options?.trim) {
                value = value.trim();
            }

            const filter: Record<string, any> =
                this.paginationService.filterContain(field, value);

            return filter;
        }
    }

    return mixin(MixinPaginationFilterContainPipe);
}
