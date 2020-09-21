import { Module } from '@nestjs/common';
import { ResponseService } from 'helper/response/response.service';

@Module({
    providers: [ResponseService],
    exports: [ResponseService],
    imports: [],
})
export class ResponseModule {}
