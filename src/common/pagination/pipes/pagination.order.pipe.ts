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
 * This pipe validates orderBy fields against allowed fields and ensures proper order direction.
 * Throws errors for invalid field names or configurations.
 *
 * @param defaultAvailableOrder - Array of allowed field names that can be used for ordering
 * @returns A dynamically created pipe class that implements PipeTransform
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms and validates ordering parameters (orderBy and orderDirection).
         * Validates that the orderBy field is in the allowed list of fields.
         * Returns pagination query object with or without order configuration based on validation.
         *
         * @param value - Input object containing orderBy, orderDirection and other pagination parameters
         * @returns Promise resolving to pagination query object with order configuration if valid
         * @throws UnprocessableEntityException when orderBy field is not in the allowed list
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
        ): IDatabaseOrderDetail<unknown> {
            return {
                [field]: orderDirection,
            };
        }

        /**
         * Adds ordering information to the request instance for later access.
         * Stores the orderBy field, direction, and available ordering fields in the request pagination metadata.
         *
         * @param orderBy - Field name to order by
         * @param orderDirection - Direction of ordering (ASC or DESC)
         * @param availableOrderBy - Array of allowed field names for ordering
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
