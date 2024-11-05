import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { DatabaseService } from 'src/common/database/services/database.service';
import { IPaginationFilterOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterStringContainPipe(
    field: string,
    options?: IPaginationFilterOptions
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterContainPipe implements PipeTransform {
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

            value = value.trim();

            this.addToRequestInstance(value);
            return this.databaseService.filterContain(field, value);
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

    return mixin(MixinPaginationFilterContainPipe);
}
