import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { ENUM_PAGINATION_FILTER_CASE_OPTIONS } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationFilterStringContainOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterContainPipe(
    field: string,
    raw: boolean,
    options?: IPaginationFilterStringContainOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterContainPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: string
        ): Promise<
            Record<string, { $regex: RegExp; $options: string } | string>
        > {
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

            let res: Record<string, any>;
            if (raw) {
                return {
                    [field]: value,
                };
            } else if (options?.fullMatch) {
                res = this.paginationService.filterContainFullMatch(
                    field,
                    value
                );
            } else {
                res = this.paginationService.filterContain(field, value);
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

    return mixin(MixinPaginationFilterContainPipe);
}
