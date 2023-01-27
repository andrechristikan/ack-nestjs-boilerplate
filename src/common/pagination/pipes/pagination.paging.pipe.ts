import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationPagingPipe(
    defaultPerPage: number
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(
            private readonly paginationService: PaginationService,
            private readonly helperNumberService: HelperNumberService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            const page: number = this.paginationService.page(
                this.helperNumberService.create(value?.page ?? 1)
            );
            const perPage: number = this.paginationService.perPage(
                this.helperNumberService.create(
                    value?.perPage ?? defaultPerPage
                )
            );
            const offset: number = this.paginationService.offset(page, perPage);

            return {
                ...value,
                page,
                perPage,
                _offset: offset,
            };
        }
    }

    return mixin(MixinPaginationPagingPipe);
}
