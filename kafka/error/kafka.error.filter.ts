import { ExceptionFilter, Catch } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class ErrorRcpFilter implements ExceptionFilter {
    catch(exception: RpcException): Observable<any> {
        return throwError(() => JSON.stringify(exception.getError()));
    }
}
