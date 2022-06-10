import { IPaginationSort } from './pagination.interface';

export abstract class PaginationFullListAbstract {
    abstract search?: string;
    abstract availableSearch?: string[];
    abstract page?: number;
    abstract perPage: number;
    abstract sort?: IPaginationSort;
    abstract availableSort?: string[];
}

export abstract class PaginationSimpleListAbstract {
    abstract search?: string;
    abstract page?: number;
    abstract perPage: number;
}

export abstract class PaginationMiniListAbstract {
    abstract perPage: number;
}
