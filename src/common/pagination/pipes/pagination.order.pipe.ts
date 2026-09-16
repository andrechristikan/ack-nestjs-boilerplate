import { Injectable, PipeTransform, Type, mixin } from '@nestjs/common';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationCursorPipeReturn,
    IPaginationOffsetPipeReturn,
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
    defaultAvailableOrder: string[] = []
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(
            private readonly requestStoreService: RequestStoreService
        ) {}

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

            const invalidField = fields.some(
                field => !availableOrderBy.includes(field)
            );
            const invalidDirection = directions.some(
                direction =>
                    direction !== EnumPaginationOrderDirectionType.asc &&
                    direction !== EnumPaginationOrderDirectionType.desc
            );

            if (invalidField) {
                throw new PaginationOrderByNotAllowedException(
                    availableOrderBy.join(', ')
                );
            } else if (invalidDirection) {
                throw new PaginationOrderDirectionNotAllowedException(
                    PaginationAllowedOrderDirections.join(', ')
                );
            }

            return this.parseOrderBy(orderByExtractFromRequest);
        }

        private resolveOrderBy(
            orderBy?: string | string[]
        ): IPaginationOrderBy[] {
            const orderByExtractFromRequest =
                this.extractOrderByToArray(orderBy);
            const parsedOrderBy =
                orderByExtractFromRequest.length === 0 ||
                defaultAvailableOrder.length === 0
                    ? [...PaginationDefaultOrderBy]
                    : this.validateOrderBy(
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

            return parsedOrderBy;
        }

        async transform(
            value: IPaginationOffsetPipeReturn | IPaginationCursorPipeReturn
        ): Promise<
            IPaginationQueryOffsetParams | IPaginationQueryCursorParams
        > {
            const orderBy = this.resolveOrderBy(value?.orderBy);

            if ('skip' in value) {
                return {
                    where: value.where,
                    limit: value.limit,
                    skip: value.skip,
                    orderBy,
                };
            }

            return {
                where: value.where,
                limit: value.limit,
                cursor: value.cursor,
                cursorField: value.cursorField,
                orderBy,
            };
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
