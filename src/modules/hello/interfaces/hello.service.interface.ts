import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HelloResponseDto } from '@modules/hello/dtos/response/hello.response.dto';

export interface IHelloService {
    hello(): Promise<IResponseReturn<HelloResponseDto>>;
}
