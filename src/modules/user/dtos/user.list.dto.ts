import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';

export class UserListDto implements PaginationListAbstract {
    readonly search: Record<string, any>;

    readonly availableSearch: string[];

    readonly page: number;

    readonly perPage: number;

    readonly offset: number;

    readonly sort: Record<string, any>;

    readonly availableSort: string[];

    // @PaginationMongoFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: boolean[];
}
