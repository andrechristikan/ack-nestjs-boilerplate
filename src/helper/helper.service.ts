import { Injectable } from '@nestjs/common';
import { ConfigService } from 'config/config.service';

@Injectable()
export class HelperService {
    constructor(private readonly configService: ConfigService) {}
    paging(setPage: number, setLimit?: number): Record<string, any> {
        const limit: number =
            (this.configService.getConfig('paging.user.limit') as number) ||
            setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }
}
