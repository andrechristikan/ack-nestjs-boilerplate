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
import {
    IPaginationQueryAvailableOrderBy,
    IPaginationQueryReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { IDatabaseOrder } from '@common/database/interfaces/database.interface';

/**
 * Creates a pagination order pipe that validates and transforms ordering parameters.
 * This pipe validates orderBy fields against allowed fields and directions, throwing errors for invalid combinations.
 *
 * @param defaultAvailableOrder - Object defining allowed order fields and their permitted directions
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: IPaginationQueryAvailableOrderBy
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates ordering parameters (orderBy and orderDirection).
         * Validates that the orderBy field is allowed and the direction is permitted for that field.
         * Throws UnprocessableEntityException if validation fails.
         *
         * @param value - Input object containing orderBy, orderDirection and other pagination parameters
         * @returns Promise resolving to pagination query object with order configuration
         * @throws UnprocessableEntityException when orderBy field or direction is not allowed
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
                !defaultAvailableOrder
            ) {
                return {
                    limit: value.limit,
                    skip: value.skip,
                    search: value.search,
                };
            }

            const finalOrderBy = value.orderBy.trim();
            const finalOrderDirection =
                value.orderDirection.trim() as ENUM_PAGINATION_ORDER_DIRECTION_TYPE;

            // Validate if the orderBy is allowed
            const orderByDirection = defaultAvailableOrder[finalOrderBy];
            if (
                !orderByDirection ||
                orderByDirection.length === 0 ||
                !orderByDirection.includes(finalOrderDirection)
            ) {
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
                order: this.buildOrderObject(finalOrderBy, finalOrderDirection),
                limit: value.limit,
                skip: value.skip,
                search: value.search,
            };
        }

        /**
         * Builds a database order object from field name and direction.
         * Creates a simple key-value object for database ordering operations.
         * 
         * @param field - Field name to order by
         * @param orderDirection - Direction of ordering (ASC or DESC)
         * @returns Database order object with field and direction
         */
        buildOrderObject(
            field: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE
        ): IDatabaseOrder {
            return {
                [field]: orderDirection,
            };
        }

        /**
         * Adds ordering information to the request instance for later access.
         * Stores the orderBy field, direction, and available ordering configuration in the request pagination metadata.
         *
         * @param orderBy - Field name to order by
         * @param orderDirection - Direction of ordering (ASC or DESC)
         * @param availableOrderBy - Configuration object of allowed order fields and directions
         */
        addToRequestInstance(
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: IPaginationQueryAvailableOrderBy
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
