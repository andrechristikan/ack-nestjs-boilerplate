import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/common/message/controllers/message.enum.controller';
import { RoleEnumController } from 'src/modules/role/controllers/role.enum.controller';
import { RoleModule } from 'src/modules/role/role.module';

@Module({
    controllers: [MessageEnumController, RoleEnumController],
    providers: [],
    exports: [],
    imports: [RoleModule],
})
export class RoutesEnumModule {}
