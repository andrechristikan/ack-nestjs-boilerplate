import { Module } from '@nestjs/common';
import { AuthModule } from 'src/common/auth/auth.module';
import { AuthEnumController } from 'src/common/auth/controllers/auth.enum.controller';
import { MessageEnumController } from 'src/common/message/controllers/message.enum.controller';

@Module({
    controllers: [AuthEnumController, MessageEnumController],
    providers: [],
    exports: [],
    imports: [AuthModule],
})
export class RoutesEnumModule {}
