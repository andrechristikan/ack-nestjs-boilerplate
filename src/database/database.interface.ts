import { IVersionOptions } from 'src/utils/version/version.interface';

export interface IDatabaseFindAllOptions extends IVersionOptions {
    limit: number;
    skip: number;
    sort?: Record<string, number>;
    populate?: Record<string, boolean>;
}

export interface IDatabaseFindOneOptions extends IVersionOptions {
    populate?: Record<string, boolean>;
}
