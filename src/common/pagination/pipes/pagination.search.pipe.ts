import { Inject, Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';

/**
 * Request-scoped pipe building a case-insensitive `OR contains` search over the given fields.
 */
export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        async transform(
            value: { search: string } & (
                | IPaginationQueryOffsetParams
                | IPaginationQueryCursorParams
            )
        ): Promise<
            IPaginationQueryOffsetParams | IPaginationQueryCursorParams
        > {
            if (!value || !value?.search || availableSearch.length === 0) {
                return value;
            }

            const finalSearch = value.search?.trim();
            this.addToRequestInstance(finalSearch, availableSearch);

            return {
                ...value,
                where: this.buildSearchObject(finalSearch, availableSearch),
            };
        }

        private buildSearchObject(
            search: string,
            availableSearch: string[]
        ): { OR: Array<Record<string, Prisma.StringFilter>> } {
            return {
                OR: availableSearch.map(field => ({
                    [field]: {
                        contains: search,
                        mode: Prisma.QueryMode.insensitive,
                    },
                })),
            };
        }

        private addToRequestInstance(
            search: string,
            availableSearch: string[]
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                search,
                availableSearch,
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
