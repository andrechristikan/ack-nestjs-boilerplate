import { Module } from '@nestjs/common';
import { MessageEnumController } from 'src/common/message/controllers/message.enum.controller';

@Module({
    controllers: [MessageEnumController],
    providers: [],
    exports: [],
    imports: [],
})
export class RoutesEnumModule {}
