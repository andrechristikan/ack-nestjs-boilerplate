import {
    Injectable,
    Type,
    mixin,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationOrderBy,
    IPaginationQuery,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    PaginationAllowedOrderDirections,
    PaginationDefaultOrderBy,
    PaginationStoreKey,
} from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';

export function PaginationOrderPipe(
    defaultAvailableOrder?: string[]
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

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

            this.requestStoreService.merge<IPaginationQuery>(
                PaginationStoreKey,
                {
                    orderBy: parsedOrderBy,
                    availableOrderBy: defaultAvailableOrder,
                }
            );

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
                throw new PaginationOrderByNotAllowedException(availableOrderBy.join(', '));
            } else if (invalidDirection) {
                throw new PaginationOrderDirectionNotAllowedException(PaginationAllowedOrderDirections.join(', '));
            }

            return this.parseOrderBy(orderByExtractFromRequest);
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
