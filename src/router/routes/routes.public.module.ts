import { Module } from '@nestjs/common';
import { HelloPublicController } from 'src/modules/hello/controllers/hello.public.controller';

@Module({
    controllers: [HelloPublicController],
    providers: [],
    exports: [],
    imports: [],
})
export class RoutesPublicModule {}
