import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';

export interface IDocDefaultHeaderOptions {
    isRequestMultipart?: boolean;
    isResponseFile?: boolean;
}

export interface IDocResponse<T> {
    serialization: ClassConstructor<T>;
}

export interface IDocJwt {
    accessToken?: boolean;
    refreshToken?: boolean;
}

export interface IDocsOptions<T> {
    header?: IDocDefaultHeaderOptions;
    params?: ApiParamOptions[];
    queries?: ApiQueryOptions[];
    response?: IDocResponse<T>;
    jwt?: IDocJwt;
    apiKey?: boolean;
}
