import React, { useState } from 'react';
import { topic } from './data/topics';

interface Article {
  uid: string;
  title: Array<{ text: string }>;
  excerpt: Array<{ text: string }>;
  coverImage: {
    url: string;
    alt: string;
  };
}

const MedicalLibraryPage: React.FC = () => {
  // Extract all articles from the topics data
  const allArticles: Article[] = [];
  topic.forEach((item) => {
    item.pageProps.topics.forEach((topicItem: any) => {
      topicItem.articles.forEach((article: Article) => {
        allArticles.push(article);
      });
    });
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 20;

  // Calculate the articles to display for the current page
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = allArticles.slice(indexOfFirstArticle, indexOfLastArticle);

  // Handle "Next" button click
  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-[#1576d1] mb-8 text-center">
        Medical Library
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentArticles.map((article) => {
          const titleText = article.title[0]?.text;
          const expertText = article.excerpt[0]?.text;
          const coverImage = article.coverImage;
          const articleUrl = `https://ada.com/editorial/${article.uid}`;

          return (
            <a
              key={article.uid}
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
            >
              {/* Article Image */}
              <img
                src={coverImage.url}
                alt={coverImage.alt}
                className="w-full h-48 object-cover"
              />

              {/* Article Content */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-[#1576d1] mb-2">
                  {titleText}
                </h2>
                <p className="text-gray-700">{expertText}</p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleNextPage}
          className="bg-[#1576d1] text-white px-6 py-2 rounded-lg hover:bg-[#1260b3] transition-colors duration-300"
        >
          Next Page
        </button>
      </div>
    </div>
  );
};

export default MedicalLibraryPage;