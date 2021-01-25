import { Injectable } from '@nestjs/common';
import { IPagination } from 'pagination/pagination.interface';
import { LIMIT } from 'pagination/pagination.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaginationService {
    constructor(private readonly configService: ConfigService) {}

    async pagination(setPage: number, setLimit?: number): Promise<IPagination> {
        const defaultLimit: number =
            this.configService.get('app.pagination') || LIMIT;

        const limit: number = defaultLimit || setLimit;
        const page: number = setPage || 1;

        const skip: number = (page - 1) * limit;
        return {
            skip,
            limit
        };
    }
}
