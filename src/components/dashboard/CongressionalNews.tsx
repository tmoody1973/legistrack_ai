import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl?: string;
  source: 'house' | 'senate' | 'congress';
}

export const CongressionalNews: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'house' | 'senate'>('all');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Try to fetch from RSS feeds with multiple CORS proxies
      const houseNews = await fetchHouseNews();
      const senateNews = await fetchSenateNews();
      
      // Combine and sort news by date
      const combinedNews = [...houseNews, ...senateNews].sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
      if (combinedNews.length > 0) {
        setNews(combinedNews);
      } else {
        // Fallback to mock data if both feeds fail
        const mockNews = generateMockNews();
        setNews(mockNews);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news. Using backup data instead.');
      
      // Fallback to mock data on error
      const mockNews = generateMockNews();
      setNews(mockNews);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch House news with multiple proxy fallbacks
  const fetchHouseNews = async (): Promise<NewsItem[]> => {
    const houseRssFeed = 'https://thehill.com/homenews/house/feed/';
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(houseRssFeed)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(houseRssFeed)}`,
      `https://cors-anywhere.herokuapp.com/${houseRssFeed}`
    ];
    
    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy, { timeout: 5000 });
        if (!response.ok) continue;
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        
        const items = Array.from(xml.querySelectorAll('item'));
        return items.map(item => {
          // Extract image URL from content if available
          const content = item.querySelector('content\\:encoded')?.textContent || '';
          const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
          const imageUrl = imgMatch ? imgMatch[1] : undefined;
          
          return {
            title: item.querySelector('title')?.textContent || 'Untitled',
            link: item.querySelector('link')?.textContent || '#',
            pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
            description: item.querySelector('description')?.textContent || '',
            imageUrl,
            source: 'house'
          };
        });
      } catch (err) {
        console.warn(`Failed to fetch House news from proxy ${proxy}:`, err);
        // Continue to next proxy
      }
    }
    
    console.warn('All House news proxies failed');
    return [];
  };

  // Fetch Senate news with multiple proxy fallbacks
  const fetchSenateNews = async (): Promise<NewsItem[]> => {
    const senateRssFeed = 'https://thehill.com/homenews/senate/feed/';
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(senateRssFeed)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(senateRssFeed)}`,
      `https://cors-anywhere.herokuapp.com/${senateRssFeed}`
    ];
    
    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy, { timeout: 5000 });
        if (!response.ok) continue;
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        
        const items = Array.from(xml.querySelectorAll('item'));
        return items.map(item => {
          // Extract image URL from content if available
          const content = item.querySelector('content\\:encoded')?.textContent || '';
          const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
          const imageUrl = imgMatch ? imgMatch[1] : undefined;
          
          return {
            title: item.querySelector('title')?.textContent || 'Untitled',
            link: item.querySelector('link')?.textContent || '#',
            pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
            description: item.querySelector('description')?.textContent || '',
            imageUrl,
            source: 'senate'
          };
        });
      } catch (err) {
        console.warn(`Failed to fetch Senate news from proxy ${proxy}:`, err);
        // Continue to next proxy
      }
    }
    
    console.warn('All Senate news proxies failed');
    return [];
  };

  // Generate mock news data for demonstration and fallback
  const generateMockNews = (): NewsItem[] => {
    const currentDate = new Date();
    const mockNewsItems = [
      {
        title: "House Passes Bipartisan Infrastructure Investment Act",
        link: "https://www.congress.gov/bill/118th-congress/house-bill/1234",
        pubDate: new Date(currentDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        description: "The House of Representatives approved a comprehensive infrastructure bill with bipartisan support, focusing on roads, bridges, and broadband expansion.",
        imageUrl: "https://images.pexels.com/photos/1550337/pexels-photo-1550337.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'house' as const
      },
      {
        title: "Senate Committee Advances Healthcare Reform Legislation",
        link: "https://www.congress.gov/bill/118th-congress/senate-bill/5678",
        pubDate: new Date(currentDate.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        description: "The Senate Health Committee moved forward with landmark healthcare legislation aimed at reducing prescription drug costs and expanding coverage.",
        imageUrl: "https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'senate' as const
      },
      {
        title: "Congressional Budget Office Releases Economic Forecast",
        link: "https://www.cbo.gov/publication/59234",
        pubDate: new Date(currentDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        description: "The CBO's latest economic outlook projects steady growth while highlighting concerns about federal debt and inflation trends.",
        imageUrl: "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'congress' as const
      },
      {
        title: "House Judiciary Committee Holds Hearing on Tech Regulation",
        link: "https://www.congress.gov/committee-materials/118th-congress/house-judiciary",
        pubDate: new Date(currentDate.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        description: "Committee members questioned tech executives about data privacy, market competition, and content moderation policies.",
        imageUrl: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'house' as const
      },
      {
        title: "Senate Confirms New Federal Reserve Board Member",
        link: "https://www.congress.gov/nomination/118th-congress/executive-nomination/456",
        pubDate: new Date(currentDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        description: "The Senate voted to confirm the President's nominee to the Federal Reserve Board of Governors in a bipartisan vote.",
        imageUrl: "https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'senate' as const
      },
      {
        title: "Joint Committee Releases Climate Change Report",
        link: "https://www.congress.gov/committee-materials/118th-congress/joint-climate",
        pubDate: new Date(currentDate.getTime() - 16 * 60 * 60 * 1000).toISOString(),
        description: "A bipartisan congressional committee issued recommendations for addressing climate change through legislative action and federal investment.",
        imageUrl: "https://images.pexels.com/photos/414837/pexels-photo-414837.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'congress' as const
      },
      {
        title: "House Speaker Announces New Legislative Priorities",
        link: "https://www.congress.gov/members/house-leadership",
        pubDate: new Date(currentDate.getTime() - 20 * 60 * 60 * 1000).toISOString(),
        description: "The Speaker outlined an ambitious agenda focusing on economic recovery, healthcare reform, and infrastructure investment for the remainder of the session.",
        imageUrl: "https://images.pexels.com/photos/1652340/pexels-photo-1652340.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'house' as const
      },
      {
        title: "Senate Majority Leader Schedules Key Votes for Next Week",
        link: "https://www.congress.gov/members/senate-leadership",
        pubDate: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        description: "The Senate will vote on several major bills next week, including appropriations legislation and judicial confirmations.",
        imageUrl: "https://images.pexels.com/photos/1056553/pexels-photo-1056553.jpeg?auto=compress&cs=tinysrgb&w=400",
        source: 'senate' as const
      }
    ];

    return mockNewsItems;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Filter news based on active tab
  const filteredNews = news.filter(item => {
    if (activeTab === 'all') return true;
    return item.source === activeTab;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Newspaper className="w-5 h-5 mr-2 text-primary-500" />
            Congressional News
          </h3>
          <p className="text-gray-600 text-sm">
            Latest updates from Capitol Hill
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchNews}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All News
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'house'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('house')}
        >
          House News
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'senate'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('senate')}
        >
          Senate News
        </button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-gray-600">Loading congressional news...</p>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-3 mt-0.5" />
            <div>
              <p className="text-amber-700">{error}</p>
              <p className="text-amber-600 text-sm mt-1">Showing backup news data instead.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* News List */}
      {!loading && filteredNews.length > 0 ? (
        <div className="space-y-6">
          {filteredNews.slice(0, 5).map((item, index) => (
            <article key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
              {/* News Image */}
              {item.imageUrl && (
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    onError={(e) => {
                      // Hide image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* News Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary-600 transition-colors"
                  >
                    {item.title}
                  </a>
                </h4>
                
                <div className="flex items-center text-xs text-gray-500 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium mr-3 ${
                    item.source === 'house' 
                      ? 'bg-blue-100 text-blue-700' 
                      : item.source === 'senate'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {item.source === 'house' ? 'House' : item.source === 'senate' ? 'Senate' : 'Congress'}
                  </span>
                  <time dateTime={item.pubDate} className="text-gray-500">
                    {formatDate(item.pubDate)}
                  </time>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                  {item.description}
                </p>
                
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 inline-flex items-center font-medium transition-colors"
                >
                  Read Full Article
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </article>
          ))}
          
          {/* View More Link */}
          <div className="text-center pt-4 border-t border-gray-100">
            <a 
              href="https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%7D" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center font-medium transition-colors"
            >
              View More Congressional Updates
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        </div>
      ) : !loading ? (
        <div className="text-center py-12">
          <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No News Available</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            There are currently no news articles available for this category. Check back later for updates.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchNews}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh News
          </Button>
        </div>
      ) : null}
    </div>
  );
};