import { applyDecorators } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';
import {
    PAGINATION_AVAILABLE_SORT,
    PAGINATION_SORT,
} from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';

export function PaginationMongoFilterId(): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, key }) => {
            return value ? { [key]: value } : undefined;
        })
    );
}

export function PaginationMongoSearch(
    availableSearch: string[]
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value }) => {
            if (!value || !availableSearch) {
                return undefined;
            }

            return {
                $or: availableSearch.map((val) => ({
                    [val]: {
                        $regex: new RegExp(value),
                        $options: 'i',
                    },
                })),
            };
        })
    );
}

export function PaginationMongoSort(
    sort = PAGINATION_SORT,
    availableSort = PAGINATION_AVAILABLE_SORT
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value }) => {
            const bSort = PAGINATION_SORT.split('@')[0];

            const rSort = value || sort;
            const field: string = rSort.split('@')[0];
            const type: string = rSort.split('@')[1];
            const convertField: string = availableSort.includes(field)
                ? field
                : bSort;

            const convertType =
                type.toUpperCase() === ENUM_PAGINATION_SORT_TYPE.DESC ? -1 : 1;

            return { [convertField]: convertType };
        })
    );
}

export function PaginationMongoFilterBoolean(
    defaultValue: boolean[]
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, key }) => {
            return value
                ? {
                      [key]: {
                          $in: value
                              .split(',')
                              .map((val: string) =>
                                  val === 'true' ? true : false
                              ),
                      },
                  }
                : { [key]: { $in: defaultValue } };
        })
    );
}

export function PaginationMongoFilterEnum<T>(
    defaultValue: T[],
    defaultEnum: Record<string, any>
): PropertyDecorator {
    return applyDecorators(
        Expose(),
        Transform(({ value, key }) => {
            return value
                ? {
                      [key]: {
                          $in: value
                              .split(',')
                              .map((val: string) => defaultEnum[val]),
                      },
                  }
                : { [key]: { $in: defaultValue } };
        })
    );
}
