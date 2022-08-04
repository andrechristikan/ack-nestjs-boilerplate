import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IAuthApi, IAuthApiRequestHashedData } from '../auth.interface';
import { ConfigService } from '@nestjs/config';
import { AuthApiDocument, AuthApiEntity } from '../schemas/auth.api.schema';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { IDatabaseFindAllOptions } from 'src/common/database/database.interface';
import { AuthApiUpdateDto } from '../dtos/auth.api.update.dto';
import {
    AuthApiCreateDto,
    AuthApiCreateRawDto,
} from '../dtos/auth.api.create.dto';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class AuthApiService {
    private readonly env: string;

    constructor(
        @DatabaseEntity(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApiDocument>,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly helperEncryptionService: HelperEncryptionService
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<AuthApiDocument[]> {
        const users = this.authApiModel.find(find).select({
            name: 1,
            key: 1,
            isActive: 1,
            createdAt: 1,
        });

        if (options && options.limit && options.skip) {
            users.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            users.sort(options.sort);
        }

        return users.lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.authApiModel.countDocuments(find);
    }

    async findOneById(_id: string): Promise<AuthApiDocument> {
        return this.authApiModel.findById(_id).lean();
    }

    async findOne(find?: Record<string, any>): Promise<AuthApiDocument> {
        return this.authApiModel.findOne(find).lean();
    }

    async findOneByKey(key: string): Promise<AuthApiDocument> {
        return this.authApiModel.findOne({ key }).lean();
    }

    async inactive(_id: string): Promise<AuthApiDocument> {
        const authApi: AuthApiDocument = await this.authApiModel.findById(_id);

        authApi.isActive = false;
        return authApi.save();
    }

    async active(_id: string): Promise<AuthApiDocument> {
        const authApi: AuthApiDocument = await this.authApiModel.findById(_id);

        authApi.isActive = true;
        return authApi.save();
    }

    async create({ name, description }: AuthApiCreateDto): Promise<IAuthApi> {
        const key = await this.createKey();
        const secret = await this.createSecret();
        const passphrase = await this.createPassphrase();
        const encryptionKey = await this.createEncryptionKey();
        const hash: string = await this.createHashApiKey(key, secret);

        const create: AuthApiDocument = new this.authApiModel({
            name,
            description,
            key,
            hash,
            passphrase,
            encryptionKey,
            isActive: true,
        });

        await create.save();

        return {
            _id: create._id,
            secret,
            passphrase,
            encryptionKey,
        };
    }

    async createRaw({
        name,
        description,
        key,
        secret,
        passphrase,
        encryptionKey,
    }: AuthApiCreateRawDto): Promise<IAuthApi> {
        const hash: string = await this.createHashApiKey(key, secret);

        const create: AuthApiDocument = new this.authApiModel({
            name,
            description,
            key,
            hash,
            passphrase,
            encryptionKey,
            isActive: true,
        });

        await create.save();

        return {
            _id: create._id,
            secret,
            passphrase,
            encryptionKey,
        };
    }

    async updateOneById(
        _id: string,
        { name, description }: AuthApiUpdateDto
    ): Promise<AuthApiDocument> {
        const authApi: AuthApiDocument = await this.authApiModel.findById(_id);

        authApi.name = name;
        authApi.description = description;

        return authApi.save();
    }

    async updateHashById(_id: string): Promise<IAuthApi> {
        const authApi: AuthApiDocument = await this.authApiModel.findById(_id);
        const secret: string = await this.createSecret();
        const hash: string = await this.createHashApiKey(authApi.key, secret);
        const passphrase: string = await this.createPassphrase();
        const encryptionKey: string = await this.createEncryptionKey();

        authApi.hash = hash;
        authApi.passphrase = passphrase;
        authApi.encryptionKey = encryptionKey;

        await authApi.save();

        return {
            _id: authApi._id,
            secret,
            passphrase,
            encryptionKey,
        };
    }

    async deleteOneById(_id: string): Promise<AuthApiDocument> {
        return this.authApiModel.findByIdAndDelete(_id);
    }

    async deleteOne(find: Record<string, any>): Promise<AuthApiDocument> {
        return this.authApiModel.findOneAndDelete(find);
    }

    async createKey(): Promise<string> {
        return this.helperStringService.random(25, {
            safe: false,
            upperCase: true,
            prefix: `${this.env}_`,
        });
    }

    async createEncryptionKey(): Promise<string> {
        return this.helperStringService.random(15, {
            safe: false,
            upperCase: true,
            prefix: `${this.env}_`,
        });
    }

    async createSecret(): Promise<string> {
        return this.helperStringService.random(35, {
            safe: false,
            upperCase: true,
        });
    }

    async createPassphrase(): Promise<string> {
        return this.helperStringService.random(16, {
            safe: true,
        });
    }

    async createHashApiKey(key: string, secret: string): Promise<string> {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }

    async validateHashApiKey(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }

    async decryptApiKey(
        apiKeyHashed: string,
        secretKey: string,
        passphrase: string
    ): Promise<IAuthApiRequestHashedData> {
        const decrypted = this.helperEncryptionService.aes256Decrypt(
            apiKeyHashed,
            secretKey,
            passphrase
        );

        return JSON.parse(decrypted);
    }

    async encryptApiKey(
        data: IAuthApiRequestHashedData,
        secretKey: string,
        passphrase: string
    ): Promise<string> {
        return this.helperEncryptionService.aes256Encrypt(
            data,
            secretKey,
            passphrase
        );
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token = `${clientId}:${clientSecret}`;
        return this.helperEncryptionService.base64Decrypt(token);
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        return this.helperEncryptionService.base64Compare(
            clientBasicToken,
            ourBasicToken
        );
    }
}
