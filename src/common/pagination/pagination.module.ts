import { DynamicModule, Module } from '@nestjs/common';
import { PaginationService } from '@common/pagination/services/pagination.service';

/**
 * Global pagination module that provides pagination services across the application.
 * Configures and exports pagination functionality for handling paginated data requests.
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
