import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationFilterEqualOptions } from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';

export function PaginationFilterEqualPipe(
    field: string,
    options?: IPaginationFilterEqualOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly databaseService: DatabaseService
        ) {}

        async transform(value: string): Promise<any> {
            if (!value) {
                return;
            }

            if (options?.raw) {
                this.addToRequestInstance(value);
                return {
                    [field]: value,
                };
            }

            const finalValue: string | number = options?.isNumber
                ? Number.parseInt(value)
                : value.trim();

            this.addToRequestInstance(finalValue);
            return this.databaseService.filterEqual(field, finalValue);
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

    return mixin(MixinPaginationFilterEqualPipe);
}
