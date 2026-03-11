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
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationOrderBy,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    PaginationAllowedOrderDirections,
    PaginationDefaultOrderBy,
} from '@common/pagination/constants/pagination.constant';

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
         * Transforms input value to add ordering functionality with validation.
         * Falls back to PaginationDefaultOrderBy if no orderBy is provided or no available order fields are configured.
         * @param {Object} value - Input object containing order parameters and pagination params
         * @param {string} [value.orderBy] - Order instruction in `field:direction` format (e.g. `createdAt:desc`). Supports a single entry only.
         * @returns {Promise<IPaginationQueryOffsetParams | IPaginationQueryCursorParams>} Transformed pagination params with orderBy as array
         * @throws {UnprocessableEntityException} When the orderBy field is not in the allowed list or the direction is not asc or desc
         */
        async transform(
            value: {
                orderBy?: string;
            } & (IPaginationQueryOffsetParams | IPaginationQueryCursorParams)
        ): Promise<
            IPaginationQueryOffsetParams | IPaginationQueryCursorParams
        > {
            if (
                !value?.orderBy ||
                !defaultAvailableOrder ||
                defaultAvailableOrder.length === 0
            ) {
                return {
                    ...value,
                    orderBy: PaginationDefaultOrderBy,
                };
            }

            const orderByExtractFromRequest = this.extractOrderByToArray(
                value.orderBy
            );

            if (orderByExtractFromRequest.length === 0) {
                return {
                    ...value,
                    orderBy: PaginationDefaultOrderBy,
                };
            }

            const parsedOrderBy = this.validateOrderBy(
                orderByExtractFromRequest,
                defaultAvailableOrder
            );

            this.addToRequestInstance(parsedOrderBy, defaultAvailableOrder);

            return {
                ...value,
                orderBy: parsedOrderBy,
            };
        }

        /**
         * Parses an orderBy string or array into an array of field-direction map objects.
         * Each entry is split by ':' to separate the field name and direction.
         * @param {string | string[]} [orderBy] - Single or multiple `field:direction` strings
         * @returns {Record<string, string>[]} Array of `{ field: direction }` objects
         */
        private extractOrderByToArray(
            orderBy?: string | string[]
        ): Record<string, string>[] {
            if (!orderBy) {
                return [];
            }

            if (Array.isArray(orderBy)) {
                return orderBy.map(entry => {
                    const trimmed = entry.toString().split(':');

                    return {
                        [trimmed[0]]: trimmed[1]?.toLowerCase(),
                    };
                });
            }

            const trimmed = orderBy.toString().split(':');
            return trimmed && trimmed.length > 0
                ? [
                      {
                          [trimmed[0]]: trimmed[1]?.toLowerCase(),
                      },
                  ]
                : [];
        }

        /**
         * Converts raw field-direction map objects into typed IPaginationOrderBy array.
         * @param {Record<string, string>[]} orderByExtractFromRequest - Array of raw `{ field: direction }` objects
         * @returns {IPaginationOrderBy[]} Typed orderBy array for Prisma queries
         */
        private parseOrderBy(
            orderByExtractFromRequest: Record<string, string>[]
        ): IPaginationOrderBy[] {
            const parsedOrderBy: IPaginationOrderBy[] = [];

            for (const entry of orderByExtractFromRequest) {
                const field = Object.keys(entry)[0];
                const direction = entry[field];

                parsedOrderBy.push({
                    [field]:
                        EnumPaginationOrderDirectionType[
                            direction as EnumPaginationOrderDirectionType
                        ],
                });
            }

            return parsedOrderBy;
        }

        /**
         * Validates that all fields and directions in the order request are allowed, then returns the parsed array.
         * @param {Record<string, string>[]} orderByExtractFromRequest - Parsed order entries to validate
         * @param {string[]} availableOrderBy - List of permitted order fields
         * @returns {IPaginationOrderBy[]} Parsed and validated orderBy array
         * @throws {UnprocessableEntityException} When a field is not in the allowed list
         * @throws {UnprocessableEntityException} When a direction is not asc or desc
         */
        private validateOrderBy(
            orderByExtractFromRequest: Record<string, string>[],
            availableOrderBy: string[]
        ): IPaginationOrderBy[] {
            const flatOrderBy = orderByExtractFromRequest.reduce(
                (acc, entry) => ({ ...acc, ...entry }),
                {}
            );

            const fields = Object.keys(flatOrderBy);
            const directions = Object.values(flatOrderBy);

            const invalidField = fields.find(
                field => !availableOrderBy.includes(field)
            );
            const invalidDirection = directions.find(
                direction =>
                    direction !== EnumPaginationOrderDirectionType.asc &&
                    direction !== EnumPaginationOrderDirectionType.desc
            );

            if (invalidField) {
                throw new UnprocessableEntityException({
                    statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
                    message: `pagination.error.orderByNotAllowed`,
                    messageProperties: {
                        allowedFields: availableOrderBy.join(', '),
                    },
                });
            } else if (invalidDirection) {
                throw new UnprocessableEntityException({
                    statusCode:
                        EnumPaginationStatusCodeError.orderDirectionNotAllowed,
                    message: `pagination.error.orderDirectionNotAllowed`,
                    messageProperties: {
                        allowedDirections:
                            PaginationAllowedOrderDirections.join(', '),
                    },
                });
            }

            return this.parseOrderBy(orderByExtractFromRequest);
        }

        /**
         * Adds order information to request instance
         * @param {IPaginationOrderBy[]} orderBy - Parsed orderBy array
         * @param {string[]} availableOrderBy - Array of allowed order fields
         * @returns {void}
         */
        private addToRequestInstance(
            orderBy: IPaginationOrderBy[],
            availableOrderBy: string[]
        ): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                orderBy,
                availableOrderBy,
            };
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
