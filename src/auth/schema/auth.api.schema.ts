import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class AuthApiEntity {
    @Prop({
        required: true,
    })
    name: string;

    @Prop({
        required: false,
    })
    description?: string;

    @Prop({
        required: true,
        trim: true,
        unique: true,
    })
    key: string;

    @Prop({
        required: true,
        trim: true,
    })
    hash: string;

    @Prop({
        required: true,
        trim: true,
    })
    encryptionKey: string;

    @Prop({
        required: true,
        trim: true,
        minLength: 16,
        maxLength: 16,
    })
    passphrase: string;

    @Prop({
        required: true,
    })
    isActive: boolean;
}

export const AuthApiDatabaseName = 'authapis';
export const AuthApiSchema = SchemaFactory.createForClass(AuthApiEntity);

export type AuthApiDocument = AuthApiEntity & Document;
