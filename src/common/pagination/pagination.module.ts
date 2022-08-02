import { Global, Module } from '@nestjs/common';
import { PaginationService } from './services/pagination.service';

@Global()
@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: [],
})
export class PaginationModule {}
