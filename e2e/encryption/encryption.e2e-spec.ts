import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { HashService } from 'src/hash/hash.service';
import {
    ENCRYPTION_IV,
    ENCRYPTION_KEY
} from 'src/encryption/encryption.constant';
import { ResponseService } from 'src/response/response.service';
import { MessageService } from 'src/message/message.service';
import {
    E2E_ENCRYPT_URL,
    E2E_ENCRYPT_DATA_URL
} from 'e2e/encryption/encryption.e2e-constant';

describe('E2E Encryption', () => {
    let app: INestApplication;
    let en: string;
    let enData: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        const configService: ConfigService = app.get(ConfigService);
        const hashService: HashService = app.get(HashService);
        const responseService: ResponseService = app.get(ResponseService);
        const messageService: MessageService = app.get(MessageService);

        const enKey: string =
            configService.get('app.encryption.key') || ENCRYPTION_KEY;
        const enIv: string =
            configService.get('app.encryption.iv') || ENCRYPTION_IV;

        const dataEn1: Record<string, any> = responseService.success(
            messageService.get('encryption.get.success')
        );
        en = await hashService.encryptAES256Bit(dataEn1, enKey, enIv);

        const dataEn2:  Record<string, any> = responseService.success(
            messageService.get('encryption.get.success'),
            dataEn1
        );
        enData = await hashService.encryptAES256Bit(dataEn2, enKey, enIv);

        await app.init();
    });

    it(`GET ${E2E_ENCRYPT_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(E2E_ENCRYPT_URL)
            .expect(200)
            .expect(en)
            .end(done);
    });

    it(`POST ${E2E_ENCRYPT_DATA_URL}`, (done) => {
        return request(app.getHttpServer())
            .post(E2E_ENCRYPT_DATA_URL)
            .set('Content-Type', `text/plain`)
            .send(en)
            .expect(200)
            .expect(enData)
            .end(done);
    });

    afterAll(async () => {
        await app.close();
    });
});
