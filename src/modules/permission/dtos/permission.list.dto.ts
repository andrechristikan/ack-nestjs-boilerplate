import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';

export class PermissionListDto implements PaginationListAbstract {
    readonly search: Record<string, any>;

    readonly availableSearch: string[];

    readonly page: number;

    readonly perPage: number;

    readonly sort: Record<string, any>;

    readonly offset: number;

    readonly availableSort: string[];

    // @PaginationMongoFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: boolean[];

    // @PaginationMongoFilterEnum(PERMISSION_DEFAULT_GROUP, ENUM_PERMISSION_GROUP)
    readonly group: string[];
}
