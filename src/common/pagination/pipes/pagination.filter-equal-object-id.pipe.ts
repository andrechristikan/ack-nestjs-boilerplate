import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { Types } from 'mongoose';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterEqualObjectIdPipe(
    field: string,
    raw: boolean
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationFilterEqualObjectIdPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: string
        ): Promise<Record<string, Types.ObjectId | string>> {
            if (!value) {
                return undefined;
            }

            value = value.trim();
            let res: Record<string, any>;
            if (raw) {
                res = {
                    [field]: value,
                };
            } else if (!Types.ObjectId.isValid(value)) {
                value = undefined;
            } else {
                const finalValue = new Types.ObjectId(value);
                res = this.paginationService.filterEqual<
                    Types.ObjectId | string
                >(field, finalValue);
            }

            this.request.__pagination = {
                ...this.request.__pagination,
                filters: this.request.__pagination?.filters
                    ? {
                          ...this.request.__pagination?.filters,
                          [field]: value,
                      }
                    : { [field]: value },
            };

            return res;
        }
    }

    return mixin(MixinPaginationFilterEqualObjectIdPipe);
}
