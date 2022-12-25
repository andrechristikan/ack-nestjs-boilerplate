import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterInBooleanPipe(
    field: string,
    defaultValue: boolean[]
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(private readonly paginationService: PaginationService) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (!value[field]) {
                return undefined;
            }

            const filter: Record<string, any> =
                this.paginationService.filterIn<boolean>(
                    field,
                    value[field]
                        ? value[field]
                              .split(',')
                              .map((val: string) => val === 'true')
                        : defaultValue
                );

            return {
                ...value,
                [field]: filter,
            };
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}
