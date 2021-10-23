import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { IErrorKafka } from './kafka.error.interface';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';
import { IErrors } from 'src/error/error.interface';

@Catch(RpcException)
export class ErrorKafkaFilter implements RpcExceptionFilter<RpcException> {
    catch(exception: RpcException): Observable<any> {
        const errors: IErrorKafka = exception.getError() as IErrorKafka;
        return throwError(JSON.stringify(errors));
    }
}

export class ErrorKafkaException extends RpcException {
    constructor(statusCode: ENUM_ERROR_STATUS_CODE, errors?: IErrors[]) {
        super({
            statusCode,
            errors
        });
    }
}
