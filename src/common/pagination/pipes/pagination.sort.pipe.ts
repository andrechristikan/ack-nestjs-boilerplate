import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationSortPipe(
    availableSort: string[]
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationSortPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            const sort: Record<string, any> = this.paginationService.sort(
                availableSort,
                value.sort
            );

            return {
                ...value,
                sort,
                availableSort,
            };
        }
    }

    return mixin(MixinPaginationSortPipe);
}
