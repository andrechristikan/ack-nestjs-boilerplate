import { Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import {
    IPaginationQuery,
    IPaginationQueryRaw,
    IPaginationSearchPipeReturn,
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

        private carryForward(
            value?: IPaginationQueryRaw
        ): IPaginationSearchPipeReturn {
            return {
                page: value?.page,
                perPage: value?.perPage,
                cursor: value?.cursor,
                orderBy: value?.orderBy,
            };
        }

        async transform(
            value?: IPaginationQueryRaw
        ): Promise<IPaginationSearchPipeReturn> {
            const search = value?.search?.trim();

            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                { availableSearch, ...(search && { search }) }
            );

            if (!search || availableSearch.length === 0) {
                return this.carryForward(value);
            }

            return {
                ...this.carryForward(value),
                where: this.buildSearchObject(search, availableSearch),
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
