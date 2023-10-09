import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterInEnumPipe<T>(
    field: string,
    defaultValue: T,
    defaultEnum: Record<string, any>,
    raw: boolean
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: string
        ): Promise<Record<string, { $in: T[] } | T[]>> {
            let finalValue: T[] = defaultValue as T[];

            if (value) {
                finalValue = value
                    .split(',')
                    .map((val: string) => defaultEnum[val])
                    .filter((val: string) => val) as T[];
            }

            let res: Record<string, any>;
            if (raw) {
                res = {
                    [field]: finalValue,
                };
            } else {
                res = this.paginationService.filterIn<T>(field, finalValue);
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

    return mixin(MixinPaginationFilterInEnumPipe);
}
