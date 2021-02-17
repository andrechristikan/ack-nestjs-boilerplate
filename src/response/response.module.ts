import { Global, Module } from '@nestjs/common';
import { MessageModule } from 'src/message/message.module';
import { ResponseService } from 'src/response/response.service';

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
