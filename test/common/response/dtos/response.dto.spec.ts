import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { ResponseDto } from 'src/common/response/dtos/response.dto';

describe('ResponseDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: ResponseDto = {
            _metadata: {
                language: faker.helpers.arrayElement(
                    Object.values(ENUM_MESSAGE_LANGUAGE)
                ),
                path: '/path/test',
                repoVersion: '1.0.0',
                timestamp: faker.date.anytime().valueOf(),
                timezone: 'Asia/Jakarta',
                version: '1',
            },
            message: 'testMessage',
            statusCode: 200,
        };

        const dto = plainToInstance(ResponseDto, response);

        expect(dto).toBeInstanceOf(ResponseDto);
        expect(dto.data).toBeUndefined();
        expect(dto.statusCode).toBeDefined();
        expect(dto.message).toBeDefined();
        expect(dto._metadata).toBeDefined();
        expect(dto._metadata.language).toBeDefined();
        expect(dto._metadata.path).toBeDefined();
        expect(dto._metadata.repoVersion).toBeDefined();
        expect(dto._metadata.timestamp).toBeDefined();
        expect(dto._metadata.timezone).toBeDefined();
        expect(dto._metadata.version).toBeDefined();
    });

    it('Should be successful calls with data', () => {
        const response: ResponseDto = {
            _metadata: {
                language: faker.helpers.arrayElement(
                    Object.values(ENUM_MESSAGE_LANGUAGE)
                ),
                path: '/path/test',
                repoVersion: '1.0.0',
                timestamp: faker.date.anytime().valueOf(),
                timezone: 'Asia/Jakarta',
                version: '1',
            },
            message: 'testMessage',
            statusCode: 200,
            data: {
                test: 'appName',
            },
        };

        const dto = plainToInstance(ResponseDto, response);

        expect(dto).toBeInstanceOf(ResponseDto);
        expect(dto.data).toBeDefined();
        expect(dto.statusCode).toBeDefined();
        expect(dto.message).toBeDefined();
        expect(dto._metadata).toBeDefined();
        expect(dto._metadata.language).toBeDefined();
        expect(dto._metadata.path).toBeDefined();
        expect(dto._metadata.repoVersion).toBeDefined();
        expect(dto._metadata.timestamp).toBeDefined();
        expect(dto._metadata.timezone).toBeDefined();
        expect(dto._metadata.version).toBeDefined();
    });
});
