import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/common/api-key/controllers/api-key.admin.controller';
import { PaginationModule } from 'src/common/pagination/pagination.module';
@Module({
    controllers: [ApiKeyAdminController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, PaginationModule],
})
export class RoutesAdminModule {}
