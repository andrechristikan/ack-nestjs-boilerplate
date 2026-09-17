import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { PaginationService } from '@common/pagination/services/pagination.service';

/**
 * Global module exposing `PaginationService` app-wide.
 */
@Module({})
export class PaginationModule {
    static forRoot(): DynamicModule {
        return {
            module: PaginationModule,
            global: true,
            providers: [PaginationService],
            exports: [PaginationService],
            imports: [],
            controllers: [],
        };
    }
}
