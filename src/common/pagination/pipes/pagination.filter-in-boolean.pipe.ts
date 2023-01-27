import { Injectable, mixin, Type } from '@nestjs/common';
import { ArgumentMetadata, PipeTransform } from '@nestjs/common/interfaces';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

export function PaginationFilterInBooleanPipe(
    defaultValue: boolean[]
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(
            private readonly paginationService: PaginationService,
            private readonly helperArrayService: HelperArrayService
        ) {}

        async transform(
            value: string,
            { data: field }: ArgumentMetadata
        ): Promise<Record<string, { $in: boolean[] }>> {
            if (!value) {
                return undefined;
            }

            const val: boolean[] = value
                ? this.helperArrayService.unique(
                      value.split(',').map((val: string) => val === 'true')
                  )
                : defaultValue;

            return this.paginationService.filterIn<boolean>(field, val);
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}
