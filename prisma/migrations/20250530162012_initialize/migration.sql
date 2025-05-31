-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniNews" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "content" TEXT,
    "pubDate" TEXT,
    "source" TEXT,
    "imageUrl" TEXT,
    "newsId" INTEGER NOT NULL,

    CONSTRAINT "MiniNews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MiniNews" ADD CONSTRAINT "MiniNews_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
