import { ClientSession } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseFindOneOptions {
    select?: Record<string, number> | Record<string, string>;
    populate?: boolean;
    session?: ClientSession;
}

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}

export interface IDatabaseOptions {
    session?: ClientSession;
}

export interface IDatabaseCreateOptions extends IDatabaseOptions {
    _id?: string;
}
