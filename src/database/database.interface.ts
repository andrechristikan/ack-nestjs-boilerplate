import { IPaginationOptions } from 'src/utils/pagination/pagination.interface';

export interface IDatabaseFindOneOptions {
    populate?: Record<string, boolean>;
}

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}
