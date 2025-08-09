import { Inject, Injectable, Type, mixin } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';

/**
 * Creates a pagination search pipe that transforms search queries into database-compatible search objects.
 *
 * This factory function creates a dynamically scoped pipe that validates search terms and
 * transforms them into database query objects with OR conditions. The pipe builds search
 * queries that perform case-insensitive partial matching across multiple specified fields.
 * It integrates with the request context to store search metadata for later access.
 *
 * @param availableSearch - Array of field names that are allowed to be searched against.
 *                         These should be valid database column names. If empty or not provided,
 *                         the pipe will skip search processing and return the original value.
 *
 * @returns A dynamically created pipe class that implements PipeTransform interface.
 *         The returned class is request-scoped and has access to the current request context.
 */
export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms search parameters from the query string into database-compatible search objects.
         *
         * This method processes the search term and builds a database query object with OR conditions
         * for partial matching across all available search fields. The search term is trimmed and
         * validated before processing. If no search term is provided or no searchable fields are
         * available, the original value is returned unchanged.
         *
         * @param value - Input object containing search parameters including:
         *               - search: The search term string to match against database fields
         *               - Other pagination parameters that will be passed through unchanged
         *
         * @returns Promise resolving to pagination query object. If search processing is successful,
         *         the returned object includes a 'search' property with database query conditions
         *         using OR logic for partial matching across all available fields.
         *         If no search term or available fields, returns the original value unchanged.
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
         * Builds a database search object with OR conditions for partial text matching.
         *
         * Creates a database query object that performs case-insensitive partial matching
         * across multiple fields using the 'contains' operator. The resulting object uses
         * OR logic to search for the term in any of the specified fields, allowing for
         * flexible multi-field search functionality.
         *
         * @param search - The search term to match against database fields. This term will be
         *                used with the 'contains' operator for partial matching in each field.
         * @param availableSearch - Array of database field names to search within. Each field
         *                         will be included in the OR condition with a contains clause.
         *
         * @returns Database query object with OR conditions. The structure follows the format:
         *         { or: [{ field1: { contains: searchTerm } }, { field2: { contains: searchTerm } }] }
         *         This object can be used directly with database query builders that support OR conditions.
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
         *
         * Stores the validated search parameters in the request's pagination metadata
         * object (__pagination). This allows other parts of the application to access
         * the search information without having to re-process the search term or field
         * configuration. The information is stored in the request scope and is available
         * throughout the request lifecycle for logging, response metadata, or other processing needs.
         *
         * @param search - The processed and trimmed search term that was used for the query.
         *                This is the actual term that will be matched against database fields.
         * @param availableSearch - Array of field names that were configured as searchable
         *                         for the current endpoint. This provides context about which
         *                         fields were included in the search operation.
         *
         * @returns void - This method modifies the request object in place.
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
