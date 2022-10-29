import { Module } from '@nestjs/common';
import { AuthModule } from 'src/common/auth/auth.module';
import { MessageEnumController } from 'src/common/message/controllers/message.enum.controller';
import { RoleEnumController } from 'src/modules/auth/controllers/role.enum.controller';
import { RoleModule } from 'src/modules/role/role.module';

@Module({
    controllers: [RoleEnumController, MessageEnumController],
    providers: [],
    exports: [],
    imports: [AuthModule, RoleModule],
})
export class RoutesEnumModule {}
