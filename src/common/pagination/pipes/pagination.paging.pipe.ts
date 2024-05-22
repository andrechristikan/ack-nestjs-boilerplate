import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import { PAGINATION_DEFAULT_PAGE } from 'src/common/pagination/constants/pagination.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationPagingPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PAGE
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            const page: number = this.paginationService.page(
                value?.page ? Number.parseInt(value?.page) : 1
            );
            const perPage: number = this.paginationService.perPage(
                Number.parseInt(value?.perPage ?? defaultPerPage)
            );
            const offset: number = this.paginationService.offset(page, perPage);

            this.addToRequestInstance(page, perPage);
            return {
                ...value,
                page,
                perPage,
                _limit: perPage,
                _offset: offset,
            };
        }

        addToRequestInstance(page: number, perPage: number): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                page,
                perPage,
            };
        }
    }

    return mixin(MixinPaginationPagingPipe);
}
