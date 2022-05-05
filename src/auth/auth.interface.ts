import { AuthApiCreateDto } from './dto/auth.api.create.dto';
import { AuthApiDocument } from './schema/auth.api.schema';

export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
}

export interface IAuthPayloadOptions {
    loginDate: Date;
}

export interface IAuthApiPayload {
    _id: string;
    key: string;
    name: string;
    description: string;
}

export interface IAuthApiDocument {
    authApi: AuthApiDocument;
    secret: string;
    passphrase: string;
}

export interface IAuthCreate extends AuthApiCreateDto {
    key?: string;
    secret?: string;
}

export interface IAuthApiRequestHashedData {
    key: string;
    timestamp: number;
    secret: string;
    hash: string;
}
