import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/message/controller/message.enum.controller';
import { MessageModule } from 'src/message/message.module';
import { RoleEnumController } from 'src/role/controller/role.enum.controller';
import { RoleModule } from 'src/role/role.module';

@Module({
    controllers: [MessageEnumController, RoleEnumController],
    providers: [],
    exports: [],
    imports: [MessageModule, RoleModule],
})
export class RouterEnumModule {}
