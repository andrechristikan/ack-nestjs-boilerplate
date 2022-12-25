import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PaginationListAbstract } from 'src/common/pagination/abstracts/pagination.abstract';

export class RoleListDto implements PaginationListAbstract {
    readonly search: Record<string, any>;

    readonly availableSearch: string[];

    readonly page: number;

    readonly perPage: number;

    readonly offset: number;

    readonly sort: Record<string, any>;

    readonly availableSort: string[];

    // @PaginationMongoFilterBoolean(PERMISSION_DEFAULT_ACTIVE)
    readonly isActive: boolean[];

    // @PaginationMongoFilterEnum(PERMISSION_DEFAULT_GROUP, ENUM_PERMISSION_GROUP)
    readonly accessFor: ENUM_AUTH_ACCESS_FOR[];
}
