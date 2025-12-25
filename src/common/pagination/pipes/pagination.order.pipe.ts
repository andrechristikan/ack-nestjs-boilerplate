import {
    BadRequestException,
    Inject,
    Injectable,
    Type,
    mixin,
} from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationOrderBy,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';

/**
 * Factory function to create PaginationOrderPipe that handles ordering functionality for pagination
 * @param {string[]} defaultAvailableOrder - Array of fields that can be used for ordering
 * @returns {Type<PipeTransform>} Configured pipe class for ordering
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

        /**
         * Transforms input value to add ordering functionality with validation
         * @param {Object} value - Input object containing order parameters and pagination params
         * @param {string} value.orderBy - Field to order by
         * @param {EnumPaginationOrderDirectionType} value.orderDirection - Direction of ordering (asc/desc)
         * @returns {Promise<IPaginationQueryOffsetParams | IPaginationQueryCursorParams>} Transformed pagination params with ordering
         * @throws {UnprocessableEntityException} When orderBy field is not in allowed list
         */
        async transform(
            value: {
                orderBy?: string;
                orderDirection?: EnumPaginationOrderDirectionType;
            } & (IPaginationQueryOffsetParams | IPaginationQueryCursorParams)
        ): Promise<
            IPaginationQueryOffsetParams | IPaginationQueryCursorParams
        > {
            if (
                !value.orderBy ||
                !value.orderDirection ||
                !defaultAvailableOrder ||
                defaultAvailableOrder.length === 0
            ) {
                return {
                    ...value,
                    orderBy: {
                        createdAt: EnumPaginationOrderDirectionType.desc,
                    },
                };
            }

            const finalOrderBy = value.orderBy.trim();
            const finalOrderDirection =
                value.orderDirection.trim() as EnumPaginationOrderDirectionType;

            if (!defaultAvailableOrder.includes(finalOrderBy)) {
                throw new BadRequestException({
                    statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
                    message: `pagination.error.orderByNotAllowed`,
                    messageProperties: {
                        allowedFields: defaultAvailableOrder.join(', '),
                    },
                });
            }

            this.addToRequestInstance(
                finalOrderBy,
                finalOrderDirection,
                defaultAvailableOrder
            );

            return {
                ...value,
                orderBy: this.buildOrderObject(
                    finalOrderBy,
                    finalOrderDirection
                ),
            };
        }

        /**
         * Builds order object for database query
         * @param {string} field - Field name to order by
         * @param {EnumPaginationOrderDirectionType} orderDirection - Order direction (asc/desc)
         * @returns {IPaginationOrderBy} Order object for query
         */
        private buildOrderObject(
            field: string,
            orderDirection: EnumPaginationOrderDirectionType
        ): IPaginationOrderBy {
            return {
                [field]: orderDirection,
            };
        }

        /**
         * Adds order information to request instance
         * @param {string} orderBy - Field to order by
         * @param {EnumPaginationOrderDirectionType} orderDirection - Order direction
         * @param {string[]} availableOrderBy - Array of allowed order fields
         * @returns {void}
         */
        private addToRequestInstance(
            orderBy: string,
            orderDirection: EnumPaginationOrderDirectionType,
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
