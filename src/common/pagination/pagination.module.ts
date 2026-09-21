import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';

/**
 * Global module exposing `PaginationService` and `PaginationQueryUtil` app-wide.
 */
@Module({})
export class PaginationModule {
    static forRoot(): DynamicModule {
        return {
            module: PaginationModule,
            global: true,
            providers: [PaginationService, PaginationQueryUtil],
            exports: [PaginationService, PaginationQueryUtil],
            imports: [],
            controllers: [],
        };
    }
}
