import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/message/controller/message.enum.controller';
import { MessageModule } from 'src/message/message.module';

@Module({
    controllers: [MessageEnumController],
    providers: [],
    exports: [],
    imports: [MessageModule],
})
export class RouterEnumModule {}
