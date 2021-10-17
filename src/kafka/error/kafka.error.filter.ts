import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { IKafkaError } from './kafka.error.interface';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';
import { IErrors } from 'src/error/error.interface';

@Catch(RpcException)
export class KafkaErrorFilter implements RpcExceptionFilter<RpcException> {
    catch(exception: RpcException): Observable<any> {
        const errors: IKafkaError = exception.getError() as IKafkaError;
        return throwError(JSON.stringify(errors));
    }
}

export class KafkaErrorException extends RpcException {
    constructor(statusCode: ENUM_ERROR_STATUS_CODE, errors?: IErrors[]) {
        super({
            statusCode,
            errors
        });
    }
}
