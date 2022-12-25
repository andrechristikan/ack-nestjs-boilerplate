import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';

export class ApiKeyListDto implements PaginationListAbstract {
    readonly search: Record<string, any>;

    readonly availableSearch: string[];

    readonly page: number;

    readonly perPage: number;

    readonly sort: Record<string, any>;

    readonly offset: number;

    readonly availableSort: string[];

    // @PaginationMongoFilterBoolean(API_KEY_DEFAULT_IS_ACTIVE)
    readonly isActive: boolean[];
}
