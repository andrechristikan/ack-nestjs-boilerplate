import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';

/** Shared module: PaginationService, PaginationQueryUtil, PaginationOffsetUtil, and PaginationFilterUtil for every list-reading repository, service, and use case. */
@Global()
@Module({})
export class PaginationModule {
    static forRoot(): DynamicModule {
        return {
            module: PaginationModule,
            controllers: [],
            providers: [
                PaginationService,
                PaginationQueryUtil,
                PaginationCursorUtil,
                PaginationOffsetUtil,
                PaginationFilterUtil,
            ],
            exports: [
                PaginationService,
                PaginationQueryUtil,
                PaginationOffsetUtil,
                PaginationFilterUtil,
            ],
            imports: [],
        };
    }
}
