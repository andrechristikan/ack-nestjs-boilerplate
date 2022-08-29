import { ClientSession } from 'mongoose';
import { IPaginationOptions } from '../pagination/pagination.interface';

export interface IDatabaseFindOneOptions {
    populate?: Record<string, boolean>;
    session?: ClientSession;
}

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}

export type IDatabaseOptions = Pick<IDatabaseFindOneOptions, 'session'>;
