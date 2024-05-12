import { Module } from '@nestjs/common';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: [],
})
export class PaginationModule {}
