import { Injectable } from '@nestjs/common';
import { IDatabaseService } from 'src/common/database/interfaces/database.service.interface';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class DatabaseService implements IDatabaseService {
    filterEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, { $eq: T }> {
        return {
            [field]: {
                $eq: filterValue,
            },
        };
    }

    filterNotEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, { $ne: T }> {
        return {
            [field]: {
                $ne: filterValue,
            },
        };
    }

    filterContain(field: string, filterValue: string): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue);
    }

    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue, {
            fullWord: true,
        });
    }

    filterIn<T = string>(
        field: string,
        filterValue: T[]
    ): Record<string, { $in: T[] }> {
        return {
            [field]: {
                $in: filterValue,
            },
        };
    }

    filterNin<T = string>(
        field: string,
        filterValue: T[]
    ): Record<
        string,
        {
            $nin: T[];
        }
    > {
        return {
            [field]: {
                $nin: filterValue,
            },
        };
    }

    filterDateBetween(
        fieldStart: string,
        fieldEnd: string,
        filterStartValue: Date,
        filterEndValue: Date
    ): Record<string, any> {
        if (fieldStart === fieldEnd) {
            return {
                [fieldStart]: {
                    $gte: filterStartValue,
                    $lte: filterEndValue,
                },
            };
        }

        return {
            [fieldStart]: {
                $gte: filterStartValue,
            },
            [fieldEnd]: {
                $lte: filterEndValue,
            },
        };
    }
}
