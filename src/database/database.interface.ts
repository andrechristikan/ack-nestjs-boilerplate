export interface IDatabaseFindOneOptions {
    populate?: Record<string, boolean>;
}

export interface IDatabaseFindAllOptions extends IDatabaseFindOneOptions {
    limit: number;
    skip: number;
    sort?: Record<string, 1 | -1>;
}
