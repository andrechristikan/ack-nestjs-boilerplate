import {
    Inject,
    Injectable,
    Type,
    UnprocessableEntityException,
    mixin,
} from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { IDatabaseOrderDetail } from '@common/database/interfaces/database.interface';

/**
 * Creates a pagination order pipe that validates and transforms ordering parameters.
 *
 * This factory function creates a dynamically scoped pipe that validates orderBy fields
 * against a predefined list of allowed fields and ensures proper order direction.
 * The pipe integrates with the request context to store ordering metadata for later access.
 *
 * @param defaultAvailableOrder - Array of allowed field names that can be used for ordering.
 *                               If not provided or empty, the pipe will skip validation
 *                               and return the original value without order configuration.
 *
 * @returns A dynamically created pipe class that implements PipeTransform interface.
 *         The returned class is request-scoped and has access to the current request context.
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates ordering parameters from the query string.
         *
         * This method validates that the orderBy field is included in the allowed list of fields
         * and processes the orderDirection parameter. If validation passes, it adds the ordering
         * information to the request context and returns an enhanced query object with order configuration.
         *
         * @param value - Input object containing pagination parameters including:
         *               - orderBy: Optional field name to order by
         *               - orderDirection: Optional direction (ASC or DESC)
         *               - Other pagination parameters (limit, offset, etc.)
         *
         * @returns Promise resolving to pagination query object. If orderBy validation passes,
         *         the returned object includes an 'order' property with database ordering configuration.
         *         If orderBy is not provided, not allowed, or defaultAvailableOrder is empty,
         *         returns the original value without order configuration.
         *
         * @throws UnprocessableEntityException when orderBy field is provided but not included
         *        in the defaultAvailableOrder array. The exception includes:
         *        - statusCode: ENUM_PAGINATION_STATUS_CODE_ERROR.ORDER_BY_NOT_ALLOWED
         *        - message: 'pagination.error.orderByNotAllowed'
         */
        async transform(
            value: {
                orderBy?: string;
                orderDirection?: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
            } & IPaginationQueryReturn
        ): Promise<IPaginationQueryReturn> {
            if (
                !value.orderBy ||
                !value.orderDirection ||
                !defaultAvailableOrder ||
                defaultAvailableOrder.length === 0
            ) {
                return value;
            }

            const finalOrderBy = value.orderBy.trim();
            const finalOrderDirection =
                value.orderDirection.trim() as ENUM_PAGINATION_ORDER_DIRECTION_TYPE;

            // Validate if the orderBy is allowed
            if (!defaultAvailableOrder.includes(finalOrderBy)) {
                throw new UnprocessableEntityException({
                    statusCode:
                        ENUM_PAGINATION_STATUS_CODE_ERROR.ORDER_BY_NOT_ALLOWED,
                    message: `pagination.error.orderByNotAllowed`,
                });
            }

            this.addToRequestInstance(
                finalOrderBy,
                finalOrderDirection,
                defaultAvailableOrder
            );

            return {
                ...value,
                order: this.buildOrderObject(finalOrderBy, finalOrderDirection),
            };
        }

        /**
         * Builds a database order object from field name and direction.
         *
         * Creates a simple key-value object that can be used directly with database
         * query builders for ordering operations. The resulting object follows the
         * standard database ordering format where the key is the field name and
         * the value is the direction.
         *
         * @param field - The database field name to order by. Should be a valid column name.
         * @param orderDirection - Direction of ordering, either 'ASC' for ascending
         *                        or 'DESC' for descending order.
         *
         * @returns Database order object with the field as key and direction as value.
         *         The object implements IDatabaseOrderDetail interface.
         */
        buildOrderObject(
            field: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE
        ): IDatabaseOrderDetail<unknown> {
            return {
                [field]: orderDirection,
            };
        }

        /**
         * Adds ordering information to the request instance for later access.
         *
         * Stores the validated ordering parameters in the request's pagination metadata
         * object (__pagination). This allows other parts of the application to access
         * the ordering information without having to re-validate or re-parse the parameters.
         * The information is stored in the request scope and is available throughout
         * the request lifecycle.
         *
         * @param orderBy - The validated field name that will be used for ordering.
         *                 This field has already been validated against availableOrderBy.
         * @param orderDirection - The direction of ordering ('ASC' or 'DESC').
         *                        This value has been trimmed and validated.
         * @param availableOrderBy - Array of all allowed field names for ordering.
         *                          This provides context about what fields are valid
         *                          for the current endpoint.
         *
         * @returns void - This method modifies the request object in place.
         */
        addToRequestInstance(
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: string[]
        ): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                orderBy,
                orderDirection,
                availableOrderBy,
            };
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
