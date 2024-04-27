import { PipeTransform, Injectable } from '@nestjs/common';
import { Document } from 'mongoose';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

@Injectable()
export class RequestParsePlainObjectPipe<T extends Document>
    implements PipeTransform
{
    async transform(value: T): Promise<ApiKeyDoc> {
        return value.toObject();
    }
}
