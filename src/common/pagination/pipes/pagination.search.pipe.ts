import { Inject, Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform, Scope } from '@nestjs/common/interfaces';
import { REQUEST } from '@nestjs/core';
import Case from 'case';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationSearchPipe(
    availableSearch: string[]
): Type<PipeTransform> {
    @Injectable({ scope: Scope.REQUEST })
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(
            @Inject(REQUEST) protected readonly request: IRequestApp,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (!value?.search) {
                this.addToRequestInstance(value?.search, availableSearch);
                return undefined;
            }

            availableSearch = availableSearch.map(e => Case.snake(e));
            const search: Record<string, any> = this.paginationService.search(
                value?.search,
                availableSearch
            );

            this.addToRequestInstance(value?.search, availableSearch);
            return {
                ...value,
                _search: search,
                _availableSearch: availableSearch,
            };
        }

        addToRequestInstance(search: string, availableSearch: string[]): void {
            this.request.__pagination = {
                ...this.request.__pagination,
                search,
                availableSearch,
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
