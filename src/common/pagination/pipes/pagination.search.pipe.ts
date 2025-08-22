import { Inject, Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';

/**
 * Creates a pipe that validates and transforms search parameters for pagination
 * @param {string[]} [availableSearch] - Array of field names that can be searched, defaults to empty array
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for search validation and transformation
 */
export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms pagination query object with search parameters into database search query
         * @param {object} value - Pagination query object containing search term and other pagination properties
         * @param {string} value.search - Search term to filter results
         * @returns {Promise<IPaginationQueryReturn>} Transformed pagination query object with search configuration
         */
        async transform(
            value: { search: string } & IPaginationQueryReturn
        ): Promise<IPaginationQueryReturn> {
            if (!value || !value?.search || availableSearch.length === 0) {
                return value;
            }

            const finalSearch = value.search?.trim();
            this.addToRequestInstance(finalSearch, availableSearch);

            return {
                ...value,
                search: this.buildSearchObject(finalSearch, availableSearch),
            };
        }

        /**
         * Builds search object for database query using OR conditions across available search fields
         * @param {string} search - Search term to apply
         * @param {string[]} availableSearch - Array of field names to search in
         * @returns {object} Search object with OR conditions for database query
         */
        buildSearchObject(
            search: string,
            availableSearch: string[]
        ): { or: Record<string, { contains: string }>[] } {
            return {
                or: availableSearch.map(field => ({
                    [field]: { contains: search },
                })),
            };
        }

        addToRequestInstance(search: string, availableSearch: string[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                search,
                availableSearch,
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
