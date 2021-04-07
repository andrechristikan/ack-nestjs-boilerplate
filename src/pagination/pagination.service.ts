import { Injectable } from '@nestjs/common';

@Injectable()
export class PaginationService {
    async skip(page: number, perPage: number): Promise<number> {
        const skip: number = (page - 1) * perPage;
        return skip;
    }

    async totalPage(totalData: number, limit: number): Promise<number> {
        return Math.ceil(totalData / limit);
    }
}
