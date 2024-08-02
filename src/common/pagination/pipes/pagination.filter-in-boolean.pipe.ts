import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { IPaginationFilterOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterInBooleanPipe(
    field: string,
    defaultValue: boolean[],
    options?: IPaginationFilterOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService,
            private readonly helperArrayService: HelperArrayService
        ) {}

        async transform(value: string): Promise<Record<string, any>> {
            if (options?.raw) {
                this.addToRequestInstance(value);
                return {
                    [field]: value,
                };
            }

            const finalValue: boolean[] = value
                ? this.helperArrayService.unique(
                      value.split(',').map((val: string) => val === 'true')
                  )
                : defaultValue;

            this.addToRequestInstance(finalValue);
            return this.paginationService.filterIn<boolean>(field, finalValue);
        }

        addToRequestInstance(value: any): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}
