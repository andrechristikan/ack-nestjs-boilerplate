import {
    KAFKA_PRODUCER_TOPICS,
    KAFKA_PRODUCER_TOPICS_REPLY
} from './producer/producer.constant';

export const KAFKA_TOPICS = [
    ...new Set([...KAFKA_PRODUCER_TOPICS, ...KAFKA_PRODUCER_TOPICS_REPLY])
].sort();
