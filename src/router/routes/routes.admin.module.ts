import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/common/api-key/controllers/api-key.admin.controller';
import { AuthModule } from 'src/common/auth/auth.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
@Module({
    controllers: [ApiKeyAdminController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, AuthModule, PaginationModule],
})
export class RoutesAdminModule {}
