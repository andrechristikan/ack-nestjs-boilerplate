import { UserSystemController } from '@modules/user/controllers/user.system.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserSystemController],
    providers: [],
    exports: [],
    imports: [UserModule],
})
export class RoutesSystemModule {}
