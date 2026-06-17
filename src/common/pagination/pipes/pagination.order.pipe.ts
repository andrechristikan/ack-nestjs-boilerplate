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
 * Request-scoped pipe parsing `field:direction` order params against an allowed-field list,
 * falling back to the default order.
 */
export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(@Inject(REQUEST) private readonly request: IRequestApp) {}

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

        private addToRequestInstance(
            orderBy: IPaginationOrderBy[],
            availableOrderBy: string[]
        ): void {
            this.request.pagination = {
                ...this.request.pagination,
                orderBy,
                availableOrderBy,
            };
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
