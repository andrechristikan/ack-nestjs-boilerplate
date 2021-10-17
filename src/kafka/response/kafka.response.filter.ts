import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { IKafkaResponseError } from './kafka.response.interface';

@Catch(RpcException)
export class KafkaResponseFilter implements RpcExceptionFilter<RpcException> {
    catch(exception: RpcException): Observable<any> {
        const errors: IKafkaResponseError = exception.getError() as IKafkaResponseError;
        return throwError(JSON.stringify(errors));
    }
}
