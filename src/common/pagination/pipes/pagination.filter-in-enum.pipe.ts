import { Injectable, mixin, Type } from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterInEnumPipe<T>(
    defaultValue: T,
    defaultEnum: Record<string, any>
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInEnumPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: string,
            { data: field }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!value) {
                return undefined;
            }

            const filter: Record<string, any> =
                this.paginationService.filterIn<T>(
                    field,
                    value
                        ? (value
                              .split(',')
                              .map((val: string) => defaultEnum[val])
                              .filter((val: string) => val) as T)
                        : defaultValue
                );

            return filter;
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}
