import { Exclude, Type } from 'class-transformer';

export class AuthApiListSerialization {
    @Type(() => String)
    readonly _id: string;

    readonly name: string;

    @Exclude()
    readonly description?: string;
    readonly key: string;

    @Exclude()
    readonly hash: string;

    readonly isActive: boolean;
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
