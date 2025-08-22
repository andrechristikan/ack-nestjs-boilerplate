import {
    Inject,
    Injectable,
    Type,
    UnprocessableEntityException,
    mixin,
} from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPaginationOrder,
    IPaginationQueryReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';

/**
 * Creates a pipe that validates and transforms pagination order parameters
 * @param {string[]} [defaultAvailableOrder] - Array of allowed field names for ordering
 * @returns {Type<PipeTransform>} A NestJS pipe transform class for order validation and transformation
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms pagination query object with order parameters
         * @param {object} value - Pagination query object containing orderBy, orderDirection and other pagination properties
         * @param {string} [value.orderBy] - Field name to order by
         * @param {ENUM_PAGINATION_ORDER_DIRECTION_TYPE} [value.orderDirection] - Order direction (ASC/DESC)
         * @returns {Promise<IPaginationQueryReturn>} Transformed pagination query object with order configuration
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
         * Builds order object for database query
         * @param {string} field - Field name to order by
         * @param {ENUM_PAGINATION_ORDER_DIRECTION_TYPE} orderDirection - Order direction
         * @returns {IPaginationOrder} Order object for database query
         */
        buildOrderObject(
            field: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE
        ): IPaginationOrder {
            return {
                [field]: orderDirection,
            };
        }

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
