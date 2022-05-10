import { Exclude, Type } from 'class-transformer';

export class AuthApiGetSerialization {
    @Type(() => String)
    readonly _id: string;

    readonly name: string;
    readonly description?: string;
    readonly key: string;

    @Exclude()
    readonly hash: string;

    readonly encryptionKey: string;
    readonly passphrase: string;

    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
