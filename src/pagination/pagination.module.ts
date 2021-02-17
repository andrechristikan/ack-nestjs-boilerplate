import { Global, Module } from '@nestjs/common';
import { PaginationService } from 'src/pagination/pagination.service';

@Global()
@Module({
    providers: [
        {
            provide: 'PaginationService',
            useClass: PaginationService
        }
    ],
    exports: [PaginationService],
    imports: []
})
export class PaginationModule {}
