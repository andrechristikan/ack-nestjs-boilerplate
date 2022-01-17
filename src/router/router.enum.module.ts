import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/message/message.controller';

@Module({
    controllers: [MessageEnumController],
    providers: [],
    exports: [],
    imports: [],
})
export class RouterEnumModule {}
