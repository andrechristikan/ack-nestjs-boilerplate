import { Global, Module } from '@nestjs/common';
import { PaginationService } from './service/pagination.service';

@Global()
@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: [],
})
export class PaginationModule {}
