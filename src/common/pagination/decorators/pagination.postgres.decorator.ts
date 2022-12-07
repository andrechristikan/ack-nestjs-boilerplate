import { applyDecorators } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';
import { IsOptional, ValidateIf } from 'class-validator';
import {
    PAGINATION_AVAILABLE_SORT,
    PAGINATION_SORT,
} from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ILike, In } from 'typeorm';

export function PaginationPostgresSearch(
    availableSearch: string[]
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        IsOptional(),
        ValidateIf((e) => e.search !== ''),
        Transform(({ value }) => {
            if (!value) {
                return undefined;
            }

            const data: Record<string, any> = {};
            availableSearch.forEach((val) => {
                data[val] = ILike(`%${value}%`);
            });

            return data;
        })
    );
}

export function PaginationPostgresSort(
    sort = PAGINATION_SORT,
    availableSort = PAGINATION_AVAILABLE_SORT
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, obj }) => {
            const bSort = PAGINATION_SORT.split('@')[0];

            const rSort = value || sort;
            const rAvailableSort = obj._availableSort || availableSort;
            const field: string = rSort.split('@')[0];
            const type: string = rSort.split('@')[1];
            const convertField: string = rAvailableSort.includes(field)
                ? field
                : bSort;

            const convertType = ENUM_PAGINATION_SORT_TYPE[type.toUpperCase()];

            return { [convertField]: convertType };
        })
    );
}

export function PaginationPostgresFilterBoolean(
    defaultValue: boolean[]
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, key }) => {
            return value
                ? {
                      [key]: In(
                          value
                              .split(',')
                              .map((val: string) =>
                                  val === 'true' ? true : false
                              )
                      ),
                  }
                : {
                      [key]: In(defaultValue),
                  };
        })
    );
}

export function PaginationPostgresFilterEnum<T>(
    defaultValue: T[],
    defaultEnum: Record<string, any>
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, key }) => {
            return value
                ? {
                      [key]: In(
                          value
                              .split(',')
                              .map((val: string) => defaultEnum[val])
                              .filter((val: string) => val !== undefined)
                      ),
                  }
                : { [key]: In(defaultValue) };
        })
    );
}
