import { Injectable } from '@nestjs/common';
import {
    PAGINATION_MAX_PAGE,
    PAGINATION_MAX_PER_PAGE,
} from 'src/common/pagination/constants/pagination.constant';

@Injectable()
export class PaginationService {
    async skip(page: number, perPage: number): Promise<number> {
        page = page > PAGINATION_MAX_PAGE ? PAGINATION_MAX_PAGE : page;
        perPage =
            perPage > PAGINATION_MAX_PER_PAGE
                ? PAGINATION_MAX_PER_PAGE
                : perPage;
        const skip: number = (page - 1) * perPage;
        return skip;
    }

    async totalPage(totalData: number, limit: number): Promise<number> {
        let totalPage = Math.ceil(totalData / limit);
        totalPage = totalPage === 0 ? 1 : totalPage;
        return totalPage > PAGINATION_MAX_PAGE
            ? PAGINATION_MAX_PAGE
            : totalPage;
    }
}
