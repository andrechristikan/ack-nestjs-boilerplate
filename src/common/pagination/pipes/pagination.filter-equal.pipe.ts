import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_PAGINATION_FILTER_CASE_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterStringEqualOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterEqualPipe(
    field: string,
    raw: boolean,
    options?: IPaginationFilterStringEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService,
            private readonly helperNumberService: HelperNumberService
        ) {}

        async transform(
            value: string
        ): Promise<Record<string, string | number>> {
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

            let finalValue: string | number = value;
            if (options?.isNumber) {
                finalValue = this.helperNumberService.check(value)
                    ? this.helperNumberService.create(value)
                    : value;
            }

            let res: Record<string, any>;
            if (raw) {
                res = {
                    [field]: finalValue,
                };
            } else {
                res = this.paginationService.filterEqual<string | number>(
                    field,
                    finalValue
                );
            }

            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          ...res,
                      }
                    : res,
            };

            return res;
        }
    }

    return mixin(MixinPaginationFilterEqualPipe);
}
