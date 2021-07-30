import {
    CallHandler,
    ExecutionContext,
    mixin,
    NestInterceptor,
    Type
} from '@nestjs/common';
import { classToPlain, plainToClass } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function ResponseTransformerInterceptor(schema: {
    new (...args: any[]): any;
}): Type<NestInterceptor> {
    class MixinResponseDataTransformerInterceptor
        implements NestInterceptor<Promise<any> | string> {
        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            return next.handle().pipe(
                map(async (response: Promise<Record<string, any> | string>) => {
                    const res: Record<string, any> | string = await response;

                    // response error must in object
                    if (typeof res === 'object') {
                        const { data, ...others } = res;
                        if (data) {
                            const transformerClass = plainToClass(schema, data);
                            const transformerPlain = classToPlain(
                                transformerClass
                            );

                            return {
                                ...others,
                                data: transformerPlain
                            };
                        }
                    }

                    return res;
                })
            );
        }
    }

    return mixin(MixinResponseDataTransformerInterceptor);
}
