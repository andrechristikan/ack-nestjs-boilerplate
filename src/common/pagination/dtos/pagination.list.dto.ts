import { ApiHideProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export class PaginationListDto {
    @ApiHideProperty()
    _search: Record<string, any>;

    @ApiHideProperty()
    _limit: number;

    @ApiHideProperty()
    _offset: number;

    @ApiHideProperty()
    _order: IPaginationOrder;

    @ApiHideProperty()
    _availableOrderBy: string[];

    @ApiHideProperty()
    _availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];

    @IsOptional()
    @ApiHideProperty()
    perPage?: number;

    @IsOptional()
    @ApiHideProperty()
    page?: number;

    @IsOptional()
    @ApiHideProperty()
    orderBy?: string;

    @IsOptional()
    @ApiHideProperty()
    orderDirection?: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
}
