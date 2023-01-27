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
        ): Promise<Record<string, { $in: T[] }>> {
            let finalValue: T[] = defaultValue as T[];

            if (value) {
                finalValue = value
                    .split(',')
                    .map((val: string) => defaultEnum[val])
                    .filter((val: string) => val) as T[];
            }

            return this.paginationService.filterIn<T>(field, finalValue);
        }
    }

    return mixin(MixinPaginationFilterInEnumPipe);
}
