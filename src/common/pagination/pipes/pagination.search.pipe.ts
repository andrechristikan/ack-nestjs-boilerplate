import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationSearchPipe(
    availableSearch: string[]
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            const search: Record<string, any> = this.paginationService.search(
                availableSearch,
                value?.search
            );

            return {
                ...value,
                search,
                availableSearch,
            };
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
