import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';

export abstract class PaginationListAbstract {
    abstract search?: Record<string, any>;
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
