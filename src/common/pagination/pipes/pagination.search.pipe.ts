import { Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import {
    IPaginationQuery,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';

export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

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
            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                { search: finalSearch, availableSearch }
            );

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
    }

    return mixin(MixinPaginationSearchPipe);
}
