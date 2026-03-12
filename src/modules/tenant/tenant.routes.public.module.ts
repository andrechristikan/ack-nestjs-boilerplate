import { Module } from '@nestjs/common';
import { TenantModule } from '@modules/tenant/tenant.module';
import { TenantPublicController } from '@modules/tenant/controllers/tenant.public.controller';

@Module({
    imports: [TenantModule],
    controllers: [TenantPublicController],
})
export class TenantRoutesPublicModule {}
