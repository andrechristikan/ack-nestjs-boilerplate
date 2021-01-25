import { IsOptional, IsPositive } from 'class-validator';

export class PaginationQueryDto {
    @IsOptional()
    @IsPositive()
    readonly limit: number;

    @IsOptional()
    @IsPositive()
    readonly page: number;
}
