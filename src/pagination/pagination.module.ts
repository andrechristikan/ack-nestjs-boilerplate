import { Module } from '@nestjs/common';
import { PaginationService } from 'src/pagination/pagination.service';

@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: []
})
export class PaginationModule {}
