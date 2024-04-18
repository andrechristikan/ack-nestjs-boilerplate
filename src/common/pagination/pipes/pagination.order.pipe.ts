import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import Case from 'case';
import { PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION } from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationOrderPipe(
    defaultOrderBy: string,
    defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
    availableOrderBy: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationOrderPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            defaultOrderBy = Case.snake(defaultOrderBy);
            availableOrderBy = availableOrderBy.map(e => Case.snake(e));

            const orderBy: string = value?.orderBy
                ? Case.snake(value?.orderBy)
                : defaultOrderBy;
            const orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE =
                value?.orderDirection ?? defaultOrderDirection;
            const availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[] =
                PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION;

            const order: Record<string, any> = this.paginationService.order(
                orderBy,
                orderDirection,
                availableOrderBy
            );

            this.addToRequestInstance(
                orderBy,
                orderDirection,
                availableOrderBy,
                availableOrderDirection
            );
            return {
                ...value,
                _order: order,
                _availableOrderBy: availableOrderBy,
                _availableOrderDirection: availableOrderDirection,
            };
        }

        addToRequestInstance(
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: string[],
            availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
        ): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                orderBy,
                orderDirection,
                availableOrderBy,
                availableOrderDirection,
            };
        }
    }

    return mixin(MixinPaginationOrderPipe);
}
