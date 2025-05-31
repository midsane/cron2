import { index } from "./createIndex.js";
import { PrismaClient } from '../generated/prisma/client.js';
// import Redis from 'ioredis';

import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
  override: true,
  debug: true,
  encoding: 'utf8',

})

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing required environment variables: REDIS_KEY, DATABASE_URL");
  process.exit(1);
}

// const QUEUE_KEY = 'news:articles';
// const redis = new Redis(REDIS_KEY);
const prisma = new PrismaClient()

interface Article {
  link: string;
  title: string;
  content?: string;
  source?: string;
  pubDate: string,
  imageUrl?: string,
  newsId: number
}


// redis.on('error', (err) => {
//   console.error('Redis connection error:', err.message);
//   process.exit(1);
// });

// process.on('SIGINT', async () => {
//   console.log('Shutting down...');
//   await redis.quit();
//   await prisma.$disconnect();
//   process.exit(0);
// });

const processArticle = async (article: Article) => {
  try {
    const queryText = `${article.title}. ${article.content}`;

    const rerankedResults = await (await index).searchRecords({
      query: { topK: 10, inputs: { text: queryText } },
      rerank: { model: 'bge-reranker-v2-m3', topN: 4, rankFields: ['chunk_text'] },
    });

    const record = {
      id: article.link,
      chunk_text: `${article.title} ${article.content}`,
      category: article.source || "",
    };

    await (await index).upsertRecords([record]);

    const isNew = rerankedResults.result.hits.length === 0 || rerankedResults.result.hits[0]._score < 0.4;

    if (isNew) {
      console.log(`New article: ${article.link}`);
      // Example Prisma operation
      const news = await prisma.news.create({
        data: {
          category: "dailyNews"
        }
      });
      const miniNews = await prisma.miniNews.create({
        data: {
          title: article.title,
          content: article.content,
          link: article.link,
          source: article.source,
          pubDate: article.pubDate,
          imageUrl: article.imageUrl,
          newsId: news.id
        }
      });

      await prisma.news.update({
        where: { id: news.id },
        data: {
          childNews: {
            connect: { id: miniNews.id }
          }
        }
      });


    } else {
      const arLink = rerankedResults.result.hits[0]._id as string;
      const relevantArticle = await prisma.miniNews.findFirst({
        where: {
          link: arLink
        },
      });
      if (relevantArticle) {
        console.log(`Continuation of: ${relevantArticle.link}`);
        const parentId = relevantArticle.newsId;
        const newChildNews = await prisma.miniNews.create({
          data: {
            title: article.title,
            content: article.content,
            link: article.link,
            source: article.source,
            pubDate: article.pubDate,
            imageUrl: article.imageUrl,
            newsId: parentId
          }
        });

        await prisma.news.update({
          where: { id: parentId },
          data: {
            childNews: {
              connect: { id: newChildNews.id }
            }
          }
        });

      } else {
        console.warn(`Relevant article not found: ${rerankedResults.result.hits[0]._id}`);
      }
    }
    console.log(`Processed: ${article.title}`);
  } catch (error) {
    console.error(`Failed to process article: ${article.title}`, error);
  }
};
import { readFile } from 'fs';


export const mainInit = async () => {
  readFile('./articles.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading articles file:', err);
      return;
    }
    try {
      const articles = JSON.parse(data);
      console.log('Articles loaded successfully:', articles.length);

      articles.forEach((article: any) => {
        if (article.link && article.title && article.source) {
          processArticle(article).catch(error => {
            console.error(`Failed to process article: ${article.title}`, error);
          });
        } else {
          console.warn(`Skipping invalid article: ${JSON.stringify(article)}`);
        }
      });
    } catch (parseError) {
      console.error('Error parsing articles JSON:', parseError);
    }
  });

}

mainInit();

// export const main = async () => {
//   try {
//     while (true) {
//       const [, articleStr] = (await redis.brpop(QUEUE_KEY, 30)) || [];
//       if (!articleStr) {
//         console.log('No articles in queue, waiting...');
//         continue;
//       }

//       let article: Article;
//       try {
//         article = JSON.parse(articleStr);
//         if (!article.link || !article.title || !article.source) {
//           throw new Error('Invalid article format');
//         }
//       } catch (error) {
//         console.error('Failed to parse article:', error);
//         continue;
//       }

//       console.log(article);
//       await processArticle(article);
//     }
//   } catch (error) {
//     console.error('Error in processing loop:', error);
//     await redis.quit();
//     await prisma.$disconnect();
//     process.exit(1);
//   }
// };

