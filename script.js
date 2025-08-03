// Helper function for creating SVG icons
function createSvgIcon(iconName, className = "") {
  const icons = {
    newspaper:
      '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4"/><path d="M10 12h8"/><path d="M10 16h8"/><path d="M10 8h4"/>',
    lightbulb:
      '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/><path d="M11 18v4"/><path d="M7 14h2"/><path d="M15 14h2"/>',
    refreshCw:
      '<path d="M21 12a9 9 0 0 0-9-9c-7.2 0-9 1.8-9 9s1.8 9 9 9h3"/><path d="M17 22v-4h4"/><path d="M17 18h4"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${icons[iconName]}</svg>`
}

class NewsAPI {
  constructor() {
    // Replace 'YOUR_NEWS_API_KEY_HERE' with your actual OpenAI API key
    this.apiKey = "YOUR_NEWS_API_KEY_HERE"
    this.baseURL = "https://newsapi.org/v2/top-headlines"
    this.pageSize = 12
  }

  async fetchNews(category = "general") {
    try {
      if (this.apiKey === "YOUR_NEWS_API_KEY_HERE" || !this.apiKey) {
        throw new Error('NewsAPI key is not configured. Please replace "YOUR_NEWS_API_KEY_HERE" in script.js.')
      }

      const params = new URLSearchParams({
        country: "us",
        category: category,
        pageSize: this.pageSize,
        apiKey: this.apiKey,
      })
      const response = await fetch(`${this.baseURL}?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid NewsAPI key. Please check your NewsAPI key.")
        } else if (response.status === 429) {
          throw new Error("NewsAPI rate limit exceeded. Please try again later.")
        } else {
          throw new Error(`NewsAPI request failed with status: ${response.status}`)
        }
      }
      const data = await response.json()

      if (data.status === "error") {
        throw new Error(data.message || "NewsAPI returned an error")
      }
      data.articles = data.articles.filter(
        (article) => article.title && article.title !== "[Removed]" && article.description && article.url,
      )
      return data
    } catch (error) {
      console.error("NewsAPI fetch failed:", error)
      if (error.message.includes("API key") || error.message.includes("rate limit")) {
        throw error 
      }
      console.warn("Using mock data as fallback")
      return this.getMockNews(category)
    }
  }

  getMockNews(category) {
    const mockArticles = {
      technology: [
        {
          title: "Revolutionary AI Model Breaks New Ground in Natural Language Processing",
          description:
            "Scientists develop groundbreaking AI system that demonstrates unprecedented language understanding capabilities.",
          url: "https://example.com/ai-breakthrough",
          source: { name: "Tech Today" },
          publishedAt: new Date().toISOString(),
          urlToImage: null,
        },
        {
          title: "Quantum Computing Milestone: 1000-Qubit Processor Unveiled",
          description: "Major tech company announces the development of the world's most powerful quantum processor.",
          url: "https://example.com/quantum-news",
          source: { name: "Quantum Weekly" },
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          urlToImage: null,
        },
      ],
      business: [
        {
          title: "Global Markets Rally as Economic Indicators Show Strong Growth",
          description: "Stock markets worldwide surge following positive economic data and corporate earnings reports.",
          url: "https://example.com/market-rally",
          source: { name: "Business Wire" },
          publishedAt: new Date().toISOString(),
          urlToImage: null,
        },
      ],
      general: [
        {
          title: "Climate Summit Reaches Historic Agreement on Carbon Reduction",
          description: "World leaders unite on ambitious new targets for global carbon emission reductions.",
          url: "https://example.com/climate-summit",
          source: { name: "Global News" },
          publishedAt: new Date().toISOString(),
          urlToImage: null,
        },
        {
          title: "Medical Breakthrough: New Treatment Shows Promise for Rare Disease",
          description:
            "Researchers announce successful trials of innovative therapy that could help thousands of patients.",
          url: "https://example.com/medical-breakthrough",
          source: { name: "Health Tribune" },
          publishedAt: new Date(Date.now() - 7200000).toISOString(),
          urlToImage: null,
        },
      ],
    }
    return {
      articles: mockArticles[category] || mockArticles.general,
      totalResults: mockArticles[category]?.length || mockArticles.general.length,
    }
  }
}

class AISummarizer {
  constructor() {
    // Replace 'YOUR_OPENAI_API_KEY_HERE' with your actual OpenAI API key
    this.apiKey = "YOUR_OPENAI_API_KEY_HERE"
    this.apiEndpoint = "https://api.openai.com/v1/chat/completions"
  }

  async summarizeArticle(title, description) {
    try {
      if (this.apiKey === "YOUR_OPENAI_API_KEY_HERE" || !this.apiKey) {
        throw new Error('OpenAI API key is not configured. Please replace "YOUR_OPENAI_API_KEY_HERE" in script.js.')
      }

      const prompt = `Please provide a concise, informative summary of this news article in 2-3 sentences. Focus on the key facts and implications:
Title: ${title}
Description: ${description}
Summary:`

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o", // You can change this to "gpt-3.5-turbo" for lower cost/faster response
          messages: [
            { role: "system", content: "You are a helpful news summarizer." },
            { role: "user", content: prompt },
          ],
          max_tokens: 150,
          temperature: 0.7, // Controls randomness. Lower for more focused summaries.
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `OpenAI API request failed: ${response.status} - ${errorData.error ? errorData.error.message : "Unknown error"}`,
        )
      }
      const data = await response.json()
      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error("AI summarization failed:", error)
      return this.createFallbackSummary(title, description)
    }
  }

  createFallbackSummary(title, description) {
    if (description && description.length > 100) {
      return description.substring(0, 150) + "..."
    }
    return description || "No additional details available for this article."
  }
}

class NewsApp {
  constructor() {
    this.newsAPI = new NewsAPI()
    this.aiSummarizer = new AISummarizer()
    this.currentArticles = []
    this.summarizedCount = 0

    this.initializeElements()
    this.bindEvents()
  }

  initializeElements() {
    this.categorySelect = document.getElementById("categorySelect")
    this.fetchBtn = document.getElementById("fetchBtn")
    this.loadingEl = document.getElementById("loading")
    this.newsGrid = document.getElementById("newsGrid")
    this.statsEl = document.getElementById("stats")
    this.totalArticlesEl = document.getElementById("totalArticles")
    this.summarizedCountEl = document.getElementById("summarizedCount")
  }

  bindEvents() {
    this.fetchBtn.addEventListener("click", () => this.fetchAndDisplayNews())
    this.fetchAndDisplayNews()
  }

  async fetchAndDisplayNews() {
    const category = this.categorySelect.value

    this.showLoading(true)
    this.fetchBtn.disabled = true
    this.newsGrid.innerHTML = ""
    this.statsEl.style.display = "none"
    this.summarizedCount = 0

    try {
      const newsData = await this.newsAPI.fetchNews(category)
      this.currentArticles = newsData.articles || []

      if (this.currentArticles.length === 0) {
        this.showError("No articles found for this category. Try a different category.")
        return
      }
      this.displayArticles()
      this.updateStats()
      this.generateSummaries()
    } catch (error) {
      console.error("Error fetching news:", error)
      let errorMessage = "Failed to fetch news. Please try again."
      if (error.message.includes("API key")) {
        errorMessage = "🔑 API key issue. Please update your API keys in script.js."
      } else if (error.message.includes("rate limit")) {
        errorMessage = "⏱️ API rate limit exceeded. Please wait a moment and try again."
      }
      this.showError(errorMessage)
    } finally {
      this.showLoading(false)
      this.fetchBtn.disabled = false
    }
  }

  displayArticles() {
    this.newsGrid.innerHTML = ""
    this.currentArticles.forEach((article, index) => {
      const articleCard = this.createArticleCard(article, index)
      this.newsGrid.appendChild(articleCard)
    })
  }

  createArticleCard(article, index) {
    const card = document.createElement("div")
    card.className = "news-card"

    const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

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
            <a href="${article.url}" target="_blank" class="read-more">
                Read Full Article ${createSvgIcon("arrowRight", "ml-2")}
            </a>
        `
    return card
  }

  async generateSummaries() {
    const summaryPromises = this.currentArticles.map(async (article, index) => {
      try {
        const summary = await this.aiSummarizer.summarizeArticle(article.title, article.description)
        const summaryEl = document.getElementById(`summary-${index}`)
        if (summaryEl) {
          summaryEl.innerHTML = summary
          this.summarizedCount++
          this.updateStats()
        }
      } catch (error) {
        console.error(`Failed to summarize article ${index}:`, error)
        const summaryEl = document.getElementById(`summary-${index}`)
        if (summaryEl) {
          summaryEl.innerHTML = article.description || "Summary unavailable."
        }
      }
    })
    await Promise.allSettled(summaryPromises)
  }

  updateStats() {
    this.totalArticlesEl.textContent = this.currentArticles.length
    this.summarizedCountEl.textContent = this.summarizedCount
    this.statsEl.style.display = "flex"
  }

  showLoading(show) {
    this.loadingEl.style.display = show ? "flex" : "none"
  }

  showError(message) {
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-message"
    errorDiv.textContent = message

    this.newsGrid.innerHTML = "" // Clear existing articles
    this.newsGrid.appendChild(errorDiv)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new NewsApp()
})
