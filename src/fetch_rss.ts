import Parser from 'rss-parser';
import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const parser = new Parser({
    customFields: {
        item: [
            ['media:thumbnail', 'mediaThumbnail'],
            ['media:content', 'mediaContent'],
            ['enclosure', 'enclosure'],
        ]
    }
});

const rssFeeds = [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://www.thehindu.com/news/national/feeder/default.rss',
    'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    'https://feeds.feedburner.com/ndtvnews-top-stories'
];

const isToday = (dateString: any) => {
    const today = new Date();
    const pubDate = new Date(dateString);
    return (
        today.getUTCFullYear() === pubDate.getUTCFullYear() &&
        today.getUTCMonth() === pubDate.getUTCMonth() &&
        today.getUTCDate() === pubDate.getUTCDate()
    );
};

let count = 0;

function extractImageUrl(item: any) {
    if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
    if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
    if (item.enclosure?.url) return item.enclosure.url;
    return "";
}

const allArticles = [];

for (const feedUrl of rssFeeds) {
    try {
        const feed = await parser.parseURL(feedUrl);
        for (const item of feed.items) {
            if (item.pubDate && isToday(item.pubDate)) {
                const article = {
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    content: item.contentSnippet || '',
                    source: feed.title,
                    imageUrl: extractImageUrl(item)

                };
                allArticles.push(article);
                count++;
            }
        }
    } catch (err) {
        console.error(`Failed to fetch ${feedUrl}:`, err);
    }
}

console.log(`fetched ${count} articles".`);
writeFile('articles.json', JSON.stringify(allArticles, null, 2))