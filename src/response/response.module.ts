import { Global, Module } from '@nestjs/common';
import { MessageModule } from 'message/message.module';
import { ResponseService } from 'response/response.service';

@Global()
@Module({
    providers: [
        {
            provide: 'ResponseService',
            useClass: ResponseService
        }
    ],
    exports: [ResponseService],
    imports: [MessageModule]
})
export class ResponseModule {}
