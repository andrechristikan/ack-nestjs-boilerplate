import { Injectable } from '@nestjs/common';
import { IPagination } from 'pagination/pagination.interface';
import { LIMIT, PAGE } from 'pagination/pagination.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaginationService {
    constructor(private readonly configService: ConfigService) {}

    async pagination(setPage: number, setLimit?: number): Promise<IPagination> {
        const defaultLimit: number =
            this.configService.get('app.pagination.limit') || LIMIT;
        const defaultPage: number =
            this.configService.get('app.pagination.page') || PAGE;

        const limit: number =  setLimit|| defaultLimit;
        const page: number = setPage || defaultPage;

        const skip: number = (page - 1) * limit;
        return {
            skip,
            limit
        };
    }
}
