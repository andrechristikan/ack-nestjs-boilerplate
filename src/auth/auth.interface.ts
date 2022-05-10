import { Types } from 'mongoose';
import { AuthApiCreateDto } from './dto/auth.api.create.dto';

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
    _id: Types.ObjectId;
    secret: string;
    passphrase: string;
    encryptionKey: string;
}

export interface IAuthApiCreate extends AuthApiCreateDto {
    key?: string;
    secret?: string;
    passphrase?: string;
    encryptionKey?: string;
}

export interface IAuthApiRequestHashedData {
    key: string;
    timestamp: number;
    hash: string;
}
