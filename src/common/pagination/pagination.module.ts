import { Global, Module } from '@nestjs/common';
import { PaginationService } from '@common/pagination/services/pagination.service';

/**
 * Global pagination module that provides pagination services across the application.
 * Configures and exports pagination functionality for handling paginated data requests.
 */
@Global()
@Module({
    providers: [PaginationService],
    exports: [PaginationService],
    imports: [],
    controllers: [],
})
export class PaginationModule {}
