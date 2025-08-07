import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { Module } from '@nestjs/common';

@Module({
    controllers: [ApiKeyAdminController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule],
})
export class RoutesAdminModule {}
