import { Inject, Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';

/**
 * Creates a pagination search pipe that transforms search queries into database-compatible search objects.
 * This pipe validates search terms against available search fields and builds OR query conditions.
 *
 * @param availableSearch - Array of field names that are allowed to be searched
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms the input value containing search parameters into a pagination query object.
         * Validates the search term and builds a search object if valid search fields are available.
         *
         * @param value - Input object containing search string and pagination parameters
         * @returns Promise resolving to pagination query object with search conditions
         */
        async transform(
            value: { search: string } & IPaginationQueryReturn
        ): Promise<IPaginationQueryReturn> {
            if (!value || !value?.search || availableSearch.length === 0) {
                return {
                    limit: value.limit,
                    skip: value.skip,
                    order: value.order,
                };
            }

            const finalSearch = value.search?.trim();
            this.addToRequestInstance(finalSearch, availableSearch);

            return {
                search: this.buildSearchObject(finalSearch, availableSearch),
                limit: value.limit,
                skip: value.skip,
                order: value.order,
            };
        }

        /**
         * Builds a search object with OR conditions for database queries.
         * Creates a contains condition for each available search field.
         *
         * @param search - The search term to match against
         * @param availableSearch - Array of field names to search in
         * @returns Array of object with OR conditions for database query
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

        /**
         * Adds search information to the request instance for later access.
         * Stores the search term and available search fields in the request pagination metadata.
         *
         * @param search - The search term being used
         * @param availableSearch - Array of searchable field names
         */
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
