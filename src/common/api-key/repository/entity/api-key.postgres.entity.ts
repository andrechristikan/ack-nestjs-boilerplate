// import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.entity.interface';
// import {
//     ApiKeyDatabaseName,
//     ApiKeyEntity,
// } from 'src/common/api-key/schemas/api-key.schema';
// import { ApiKeyBeforeSaveHook } from 'src/common/api-key/schemas/hooks/api-key.before-save.hook';
// import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
// import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

// @Entity({ name: ApiKeyDatabaseName })
// export class ApiKeyPostgresEntity
//     extends DatabasePostgresEntityAbstract
//     implements IApiKeyEntity
// {
//     @Column({
//         nullable: false,
//         type: String,
//     })
//     name: string;

//     @Column({
//         nullable: true,
//         type: String,
//     })
//     description?: string;

//     @Column({
//         nullable: false,
//         type: String,
//         unique: true,
//     })
//     key: string;

//     @Column({
//         nullable: false,
//         type: String,
//     })
//     hash: string;

//     @Column({
//         nullable: false,
//         type: String,
//     })
//     encryptionKey: string;

//     @Column({
//         nullable: false,
//         type: String,
//         length: 16,
//     })
//     passphrase: string;

//     @Column({
//         nullable: false,
//         type: Boolean,
//     })
//     isActive: boolean;

//     @BeforeInsert()
//     @BeforeUpdate()
//     beforeSave() {
//         const hook = ApiKeyBeforeSaveHook.bind(this);
//         hook();
//     }
// }

// export const ApiKeyPostgresSchema = ApiKeyPostgresEntity;
