import { Module } from '@nestjs/common';
import { PaginationService } from './services/pagination.service';

@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: [],
})
export class PaginationModule {}
