import { ClientSession } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseFindOneOptions {
    populate?: boolean;
    session?: ClientSession;
}

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}

export type IDatabaseOptions = Pick<IDatabaseFindOneOptions, 'session'>;
