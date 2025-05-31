
import { Pinecone } from '@pinecone-database/pinecone';


const PINECONE_INDEX_NAME = 'midnews-js'
const PINECONE_NAMESPACE = 'news-namespace'

import dotenv from 'dotenv';
dotenv.config({
    path: './.env',
    override: true,
    debug: true,
    encoding: 'utf8',

})

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_API_KEY) {
    console.error('Missing PINECONE_API_KEY in environment variables');
    process.exit(1);
}

const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
});


const indexExists = async (indexName: string) => {
    try {
        const indexes = await pc.listIndexes();
        console.log('Available indexes:', indexes);
        if (!indexes || !indexes.indexes) return false;
        for (const index of indexes.indexes) {
            if (index.name === indexName) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking index existence:', error);
        throw error;
    }
};


const init = async () => {
    try {

        const exists = await indexExists(PINECONE_INDEX_NAME);
        console.log(`Index exists: ${exists}`);
        if (!exists) {
            console.log(`Creating index: ${PINECONE_INDEX_NAME}`);
            await pc.createIndexForModel({
                name: PINECONE_INDEX_NAME,
                cloud: 'aws',
                region: 'us-east-1',
                embed: {
                    model: 'llama-text-embed-v2',
                    fieldMap: { text: 'chunk_text' },
                },
                waitUntilReady: true,
            });
            console.log(`Index ${PINECONE_INDEX_NAME} created successfully`);
        } else {
            console.log(`Index ${PINECONE_INDEX_NAME} already exists`);
        }
        return pc.index(PINECONE_INDEX_NAME).namespace(PINECONE_NAMESPACE);
    } catch (error) {
        console.error('Failed to initialize Pinecone index:', error);
        throw error;
    }
};


const indexPromise = init();


process.on('SIGINT', () => {
    console.log('Shutting down Pinecone client...');
    process.exit(0);
});

export { indexPromise as index };