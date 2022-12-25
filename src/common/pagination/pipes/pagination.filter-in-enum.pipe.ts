import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterInEnumPipe<T>(
    field: string,
    defaultValue: T,
    defaultEnum: Record<string, any>
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (!value[field]) {
                return undefined;
            }

            const filter: Record<string, any> =
                this.paginationService.filterIn<T>(
                    field,
                    value[field]
                        ? value[field]
                              .split(',')
                              .map((val: string) => defaultEnum[val])
                              .filter((val: string) => val)
                        : defaultValue
                );

            return {
                ...value,
                [field]: filter,
            };
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}
