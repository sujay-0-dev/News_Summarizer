  class NewsAPI {
            constructor() {
                // Replace 'YOUR_API_KEY_HERE' with your actual NewsAPI key
                this.apiKey = 'e286b576475649948b585ce773e97986';
                this.baseURL = 'https://newsapi.org/v2/top-headlines';
                this.pageSize = 12; // Number of articles to fetch
            }

            async fetchNews(category = 'general') {
                try {
                    // Construct the API URL with parameters
                    const params = new URLSearchParams({
                        country: 'us',
                        category: category,
                        pageSize: this.pageSize,
                        apiKey: this.apiKey
                    });

                    const response = await fetch(`${this.baseURL}?${params}`);
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error('Invalid API key. Please check your NewsAPI key.');
                        } else if (response.status === 429) {
                            throw new Error('API rate limit exceeded. Please try again later.');
                        } else {
                            throw new Error(`API request failed with status: ${response.status}`);
                        }
                    }

                    const data = await response.json();
                    
                    if (data.status === 'error') {
                        throw new Error(data.message || 'API returned an error');
                    }

                    // Filter out articles with missing content
                    data.articles = data.articles.filter(article => 
                        article.title && 
                        article.title !== '[Removed]' && 
                        article.description &&
                        article.url
                    );

                    return data;
                } catch (error) {
                    console.error('NewsAPI fetch failed:', error);
                    
                    // If API fails, show error and use mock data as fallback
                    if (error.message.includes('API key') || error.message.includes('rate limit')) {
                        throw error; // Don't use fallback for auth/rate limit errors
                    }
                    
                    console.warn('Using mock data as fallback');
                    return this.getMockNews(category);
                }
            }

            getMockNews(category) {
                const mockArticles = {
                    technology: [
                        {
                            title: "Revolutionary AI Model Breaks New Ground in Natural Language Processing",
                            description: "Scientists develop groundbreaking AI system that demonstrates unprecedented language understanding capabilities.",
                            url: "https://example.com/ai-breakthrough",
                            source: { name: "Tech Today" },
                            publishedAt: new Date().toISOString(),
                            urlToImage: null
                        },
                        {
                            title: "Quantum Computing Milestone: 1000-Qubit Processor Unveiled",
                            description: "Major tech company announces the development of the world's most powerful quantum processor.",
                            url: "https://example.com/quantum-news",
                            source: { name: "Quantum Weekly" },
                            publishedAt: new Date(Date.now() - 3600000).toISOString(),
                            urlToImage: null
                        }
                    ],
                    business: [
                        {
                            title: "Global Markets Rally as Economic Indicators Show Strong Growth",
                            description: "Stock markets worldwide surge following positive economic data and corporate earnings reports.",
                            url: "https://example.com/market-rally",
                            source: { name: "Business Wire" },
                            publishedAt: new Date().toISOString(),
                            urlToImage: null
                        }
                    ],
                    general: [
                        {
                            title: "Climate Summit Reaches Historic Agreement on Carbon Reduction",
                            description: "World leaders unite on ambitious new targets for global carbon emission reductions.",
                            url: "https://example.com/climate-summit",
                            source: { name: "Global News" },
                            publishedAt: new Date().toISOString(),
                            urlToImage: null
                        },
                        {
                            title: "Medical Breakthrough: New Treatment Shows Promise for Rare Disease",
                            description: "Researchers announce successful trials of innovative therapy that could help thousands of patients.",
                            url: "https://example.com/medical-breakthrough",
                            source: { name: "Health Tribune" },
                            publishedAt: new Date(Date.now() - 7200000).toISOString(),
                            urlToImage: null
                        }
                    ]
                };

                return {
                    articles: mockArticles[category] || mockArticles.general,
                    totalResults: mockArticles[category]?.length || mockArticles.general.length
                };
            }
        }

        class AISummarizer {
            async summarizeArticle(title, description) {
                try {
                    const prompt = `Please provide a concise, informative summary of this news article in 2-3 sentences. Focus on the key facts and implications:

Title: ${title}
Description: ${description}

Summary:`;

                    const response = await fetch("https://api.anthropic.com/v1/messages", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "claude-sonnet-4-20250514",
                            max_tokens: 150,
                            messages: [
                                { role: "user", content: prompt }
                            ]
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`API request failed: ${response.status}`);
                    }

                    const data = await response.json();
                    return data.content[0].text.trim();
                } catch (error) {
                    console.error('AI summarization failed:', error);
                    // Fallback to a simple summary
                    return this.createFallbackSummary(title, description);
                }
            }

            createFallbackSummary(title, description) {
                if (description && description.length > 100) {
                    return description.substring(0, 150) + '...';
                }
                return description || 'No additional details available for this article.';
            }
        }

        class NewsApp {
            constructor() {
                this.newsAPI = new NewsAPI();
                this.aiSummarizer = new AISummarizer();
                this.currentArticles = [];
                this.summarizedCount = 0;
                
                this.initializeElements();
                this.bindEvents();
            }

            initializeElements() {
                this.categorySelect = document.getElementById('categorySelect');
                this.fetchBtn = document.getElementById('fetchBtn');
                this.loading = document.getElementById('loading');
                this.newsGrid = document.getElementById('newsGrid');
                this.stats = document.getElementById('stats');
                this.totalArticles = document.getElementById('totalArticles');
                this.summarizedCountEl = document.getElementById('summarizedCount');
            }

            bindEvents() {
                this.fetchBtn.addEventListener('click', () => this.fetchAndDisplayNews());
                
                // Auto-fetch news on page load
                this.fetchAndDisplayNews();
            }

            async fetchAndDisplayNews() {
                const category = this.categorySelect.value;
                
                this.showLoading(true);
                this.fetchBtn.disabled = true;
                this.newsGrid.innerHTML = '';
                this.stats.style.display = 'none';
                this.summarizedCount = 0;

                try {
                    const newsData = await this.newsAPI.fetchNews(category);
                    this.currentArticles = newsData.articles || [];
                    
                    if (this.currentArticles.length === 0) {
                        this.showError('No articles found for this category. Try a different category.');
                        return;
                    }

                    this.displayArticles();
                    this.updateStats();
                    this.generateSummaries();
                    
                } catch (error) {
                    console.error('Error fetching news:', error);
                    
                    let errorMessage = 'Failed to fetch news. Please try again.';
                    
                    if (error.message.includes('API key')) {
                        errorMessage = '🔑 Invalid API key. Please update your NewsAPI key in the code.';
                    } else if (error.message.includes('rate limit')) {
                        errorMessage = '⏱️ API rate limit exceeded. Please wait a moment and try again.';
                    }
                    
                    this.showError(errorMessage);
                } finally {
                    this.showLoading(false);
                    this.fetchBtn.disabled = false;
                }
            }

            displayArticles() {
                this.newsGrid.innerHTML = '';
                
                this.currentArticles.forEach((article, index) => {
                    const articleCard = this.createArticleCard(article, index);
                    this.newsGrid.appendChild(articleCard);
                });
            }

            createArticleCard(article, index) {
                const card = document.createElement('div');
                card.className = 'news-card';
                card.style.animationDelay = `${index * 0.1}s`;
                
                const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                card.innerHTML = `
                    <h3 class="news-title">${article.title}</h3>
                    <div class="news-meta">
                        <span class="news-source">${article.source.name}</span>
                        <span class="news-date">${publishedDate}</span>
                    </div>
                    <div class="news-summary" id="summary-${index}">
                        <div class="summary-loading">
                            <div class="mini-spinner"></div>
                            Generating AI summary...
                        </div>
                    </div>
                    <a href="${article.url}" target="_blank" class="read-more">Read Full Article →</a>
                `;

                return card;
            }

            async generateSummaries() {
                const summaryPromises = this.currentArticles.map(async (article, index) => {
                    try {
                        const summary = await this.aiSummarizer.summarizeArticle(
                            article.title, 
                            article.description
                        );
                        
                        const summaryEl = document.getElementById(`summary-${index}`);
                        if (summaryEl) {
                            summaryEl.innerHTML = summary;
                            this.summarizedCount++;
                            this.updateStats();
                        }
                    } catch (error) {
                        console.error(`Failed to summarize article ${index}:`, error);
                        const summaryEl = document.getElementById(`summary-${index}`);
                        if (summaryEl) {
                            summaryEl.innerHTML = article.description || 'Summary unavailable.';
                        }
                    }
                });

                await Promise.allSettled(summaryPromises);
            }

            updateStats() {
                this.totalArticles.textContent = this.currentArticles.length;
                this.summarizedCountEl.textContent = this.summarizedCount;
                this.stats.style.display = 'flex';
            }

            showLoading(show) {
                this.loading.style.display = show ? 'block' : 'none';
            }

            showError(message) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                
                this.newsGrid.innerHTML = '';
                this.newsGrid.appendChild(errorDiv);
            }
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new NewsApp();
        });