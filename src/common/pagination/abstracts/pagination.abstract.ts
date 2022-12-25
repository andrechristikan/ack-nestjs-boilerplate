export abstract class PaginationListAbstract {
    abstract search: Record<string, any>;
    abstract availableSearch: string[];
    abstract page: number;
    abstract perPage: number;
    abstract offset: number;
    abstract sort: Record<string, any>;
    abstract availableSort: string[];
}
