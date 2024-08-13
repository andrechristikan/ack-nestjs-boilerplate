import { DynamicModule, Global, Module } from '@nestjs/common';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

@Global()
@Module({})
export class PaginationModule {
    static forRoot(): DynamicModule {
        return {
            module: PaginationModule,
            providers: [PaginationService],
            exports: [PaginationService],
            imports: [],
            controllers: [],
        };
    }
}
