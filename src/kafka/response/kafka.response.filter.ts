import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Catch()
export class KafkaResponseFilter extends BaseRpcExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): Observable<any> {
        console.log('exception', exception);
        console.log('host', host);
        return super.catch(exception, host);
    }
}
