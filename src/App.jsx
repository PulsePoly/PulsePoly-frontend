import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Sidebar from './components/Sidebar'
import EventDetail from './components/EventDetail'
import LightPillar from './components/LightPillar'

// Import SVG icons from assets
import SportsIcon from '../assets/sport-16-regular.svg'
import CryptoIcon from '../assets/crypto-chat-mobile-phone.svg'
import MoviesIcon from '../assets/movie (1).svg'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [isAiRetry, setIsAiRetry] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [currentView, setCurrentView] = useState('home')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [myMarkets, setMyMarkets] = useState([])
  const [eventDetailLoading, setEventDetailLoading] = useState(false)
  const [eventDetailError, setEventDetailError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const itemsPerPage = 50
  
  useEffect(() => {
    const saved = localStorage.getItem('polymarket_myMarkets')
    if (saved) {
      try {
        setMyMarkets(JSON.parse(saved))
      } catch (e) {
      }
    }
  }, [])
  useEffect(() => {
    if (myMarkets.length > 0) {
      localStorage.setItem('polymarket_myMarkets', JSON.stringify(myMarkets))
    } else {
      localStorage.removeItem('polymarket_myMarkets')
    }
  }, [myMarkets])

  // Removed trending events auto-load on homepage

  const saveToMyMarkets = (query, queryType = 'search', tagId = null, categoryName = null) => {
    const newMarket = {
      id: Date.now().toString(),
      query,
      queryType,
      tagId,
      categoryName,
      savedAt: new Date().toISOString(),
      pinned: false
    }
    
    setMyMarkets(prev => {
      const exists = prev.find(m => 
        m.query === query && m.queryType === queryType && m.tagId === tagId
      )
      if (exists) return prev
      
      return [newMarket, ...prev]
    })
  }

  const togglePinMarket = (marketId) => {
    setMyMarkets(prev => {
      const updated = prev.map(m => 
        m.id === marketId ? { ...m, pinned: !m.pinned } : m
      )
      return updated.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.savedAt) - new Date(a.savedAt)
      })
    })
  }

  const removeMarket = (marketId) => {
    setMyMarkets(prev => prev.filter(m => m.id !== marketId))
  }

  const clearAllMarkets = () => {
    if (window.confirm('Are you sure you want to delete all saved markets?')) {
      setMyMarkets([])
    }
  }
  const fetchEventById = async (identifier) => {
    if (!identifier) {
      return null
    }

    setEventDetailLoading(true)
    setEventDetailError(null)

    const endpoints = [
      `/api/events/${identifier}`,
    ]

    if (typeof identifier === 'string' && identifier.includes('-')) {
      endpoints.push(`/api/events/${identifier}`)
    }

    for (const apiUrl of endpoints) {
      try {
        const response = await fetch(apiUrl)

        if (response.ok) {
          const data = await response.json()
          setEventDetailLoading(false)
          return data
        } else if (response.status === 404) {
          continue
        } else {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (err) {
        if (err.message.includes('404')) {
          continue
        }
      }
    }

    setEventDetailLoading(false)
    return null
  }

  const openEventDetail = async (event) => {
    setSelectedEvent(event)
    setEventDetailError(null)

    const identifier = event.id || event.slug || event.ticker
    
    if (identifier) {
      const fullEventData = await fetchEventById(identifier)
      if (fullEventData) {
        setSelectedEvent(fullEventData)
      }
    }
  }

  const closeEventDetail = () => {
    setSelectedEvent(null)
    setEventDetailError(null)
  }

  // Calculate Yes/No percentages from Jupiter pricing data
  const calculatePercentagesFromPricing = (pricing) => {
    if (!pricing) {
      return { yesPercent: 50, noPercent: 50, yesPrice: 0.5, noPrice: 0.5 }
    }
    
    // Get buy prices (Jupiter prices are in micro-dollars, so divide by 1,000,000 to get actual price)
    const buyYesPriceUsd = parseFloat(pricing.buyYesPriceUsd || 0)
    const buyNoPriceUsd = parseFloat(pricing.buyNoPriceUsd || 0)
    
    // If prices are 0 or invalid, use default 50/50
    if (buyYesPriceUsd <= 0 && buyNoPriceUsd <= 0) {
      return { yesPercent: 50, noPercent: 50, yesPrice: 0.5, noPrice: 0.5 }
    }
    
    // Calculate total price (both are in same scale, so ratio works directly)
    const totalPrice = buyYesPriceUsd + buyNoPriceUsd
    
    // Calculate percentages (normalize to 0-1 range)
    // The prices represent the cost to buy $1, so the ratio gives us the probability
    const yesPrice = totalPrice > 0 ? buyYesPriceUsd / totalPrice : 0.5
    const noPrice = totalPrice > 0 ? buyNoPriceUsd / totalPrice : 0.5
    
    // Convert to percentages
    const yesPercent = Math.round(yesPrice * 100)
    const noPercent = Math.round(noPrice * 100)
    
    return { yesPercent, noPercent, yesPrice, noPrice }
  }

  // Normalize Jupiter API event format to match Polymarket format
  const normalizeJupiterEvent = (jupiterEvent) => {
    const metadata = jupiterEvent.metadata || {}
    const markets = jupiterEvent.markets || []
    
    // Parse volume from string (Jupiter returns it as string)
    const volumeUsd = parseFloat(jupiterEvent.volumeUsd || jupiterEvent.tvlDollars || '0') || 0
    
    // Extract outcomes from markets (each market is an outcome option)
    // For Jupiter: each market represents one outcome (e.g., "Lando Norris", "Max Verstappen")
    const outcomeOptions = markets
      .filter(market => market.status === 'open') // Only show open markets
      .map(market => {
        const marketMetadata = market.metadata || {}
        const outcomeName = marketMetadata.title || market.marketId || 'Unknown'
        
        // Calculate Yes percentage from pricing
        let yesPercent = 50
        let noPercent = 50
        let yesPrice = 0.5
        let noPrice = 0.5
        
        if (market.pricing) {
          const pricingData = calculatePercentagesFromPricing(market.pricing)
          yesPercent = pricingData.yesPercent
          noPercent = pricingData.noPercent
          yesPrice = pricingData.yesPrice
          noPrice = pricingData.noPrice
        }
        
        return {
          name: outcomeName,
          percent: yesPercent,
          yesPrice: yesPrice,
          noPrice: noPrice,
          marketId: market.marketId,
          market: market
        }
      })
      .sort((a, b) => b.percent - a.percent) // Sort by percentage descending
    
    // For binary outcomes, use first market if available
    const primaryMarket = markets.length > 0 ? markets[0] : null
    let yesPercent = 50
    let noPercent = 50
    let yesPrice = 0.5
    let noPrice = 0.5
    
    if (primaryMarket && primaryMarket.pricing) {
      const pricingData = calculatePercentagesFromPricing(primaryMarket.pricing)
      yesPercent = pricingData.yesPercent
      noPercent = pricingData.noPercent
      yesPrice = pricingData.yesPrice
      noPrice = pricingData.noPrice
    }
    
    // Get outcomes and prices from markets
    let outcomes = outcomeOptions.length > 0 
      ? outcomeOptions.map(o => o.name)
      : ['Yes', 'No']
    let outcomePrices = outcomeOptions.length > 0
      ? outcomeOptions.map(o => o.yesPrice)
      : [yesPrice, noPrice]
    
    return {
      id: jupiterEvent.eventId || jupiterEvent.id,
      slug: jupiterEvent.eventId || jupiterEvent.id,
      title: metadata.title || jupiterEvent.title || '',
      question: metadata.title || jupiterEvent.title || '',
      description: metadata.subtitle || metadata.description || jupiterEvent.closeCondition || '',
      image: metadata.image || metadata.icon || '',
      volume: volumeUsd,
      volumeUsd: volumeUsd,
      volumeClob: volumeUsd,
      totalVolume: volumeUsd,
      liquidity: volumeUsd, // Jupiter uses tvlDollars which is similar to liquidity
      liquidityUsd: volumeUsd,
      totalLiquidity: volumeUsd,
      endDate: jupiterEvent.beginAt || null,
      closesAt: jupiterEvent.beginAt || null,
      closedTime: null,
      outcomes: outcomes,
      outcomePrices: outcomePrices,
      // Add outcome options with percentages for card display
      outcomeOptions: outcomeOptions,
      markets: markets.map(market => {
        // Calculate percentages for each market from its pricing
        let marketYesPrice = yesPrice
        let marketNoPrice = noPrice
        let marketYesPercent = yesPercent
        let marketNoPercent = noPercent
        
        if (market.pricing) {
          const marketPricing = calculatePercentagesFromPricing(market.pricing)
          marketYesPrice = marketPricing.yesPrice
          marketNoPrice = marketPricing.noPrice
          marketYesPercent = marketPricing.yesPercent
          marketNoPercent = marketPricing.noPercent
        }
        
        return {
          id: market.marketId || market.id,
          outcomes: market.outcomes || outcomes,
          outcomePrices: [marketYesPrice, marketNoPrice],
          volumeNum: volumeUsd,
          liquidityNum: volumeUsd,
          active: market.status === 'open' || jupiterEvent.isActive,
          closed: market.status === 'closed' || !jupiterEvent.isActive,
          // Add calculated percentages for easy access
          yesPercent: marketYesPercent,
          noPercent: marketNoPercent,
          metadata: market.metadata || {}
        }
      }),
      active: jupiterEvent.isActive || false,
      closed: !jupiterEvent.isActive || false,
      archived: false,
      category: jupiterEvent.category || '',
      subcategory: jupiterEvent.subcategory || '',
      // Add calculated percentages for easy access
      yesPercent: yesPercent,
      noPercent: noPercent
    }
  }

  const categories = [
    { id: 'sports', name: 'Sports', icon: '⚽', tagId: '1', tagSlug: 'sports' },
    { id: 'politics', name: 'Politics', icon: '🗳️', tagId: '2', tagSlug: 'politics' },
    { id: 'crypto', name: 'Crypto', icon: '₿', tagId: '21', tagSlug: 'crypto' },
    { id: 'technology', name: 'Technology', icon: '💻', tagId: '22', tagSlug: 'technology' },
    { id: 'basketball', name: 'Basketball', icon: '🏀', tagId: '28', tagSlug: 'basketball' },
    { id: 'movies', name: 'Movies', icon: '🎬', tagId: '53', tagSlug: 'movies' },
    { id: 'esports', name: 'Esports', icon: '🎮', tagId: '64', tagSlug: 'esports' },
    { id: 'science', name: 'Science', icon: '🔬', tagId: '74', tagSlug: 'science' },
    { id: 'weather', name: 'Weather', icon: '🌤️', tagId: '84', tagSlug: 'weather' },
    { id: 'music', name: 'Music', icon: '🎵', tagId: '100', tagSlug: 'music' }
  ]

  const searchEventsByTagId = async (tagId, page = 1, append = false) => {
    if (!tagId) {
      return
    }

    if (page === 1) {
      setLoading(true)
      setEvents([])
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const limit = itemsPerPage
      const offset = (page - 1) * itemsPerPage
      const category = categories.find(cat => cat.tagId === tagId)
      const tagSlug = category ? category.tagSlug : null
      
      if (!tagSlug) {
        throw new Error('Category not found')
      }

      // Use API endpoint
      const apiUrl = `/api/gamma/events/pagination?limit=${limit}&offset=${offset}&active=true&archived=false&tag_slug=${tagSlug}&closed=false&order=volume&ascending=false`

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      let eventsData = []

      // Handle Polymarket pagination API response format
      if (Array.isArray(data)) {
        eventsData = data
      } else if (data && typeof data === 'object') {
        if (data.data && Array.isArray(data.data)) {
          eventsData = data.data
        } else if (data.events && Array.isArray(data.events)) {
          eventsData = data.events
        } else if (data.results && Array.isArray(data.results)) {
          eventsData = data.results
        } else if (data.markets && Array.isArray(data.markets)) {
          eventsData = data.markets
        } else {
          for (const key in data) {
            if (Array.isArray(data[key]) && data[key].length > 0) {
              eventsData = data[key]
              break
            }
          }
        }
      }

      const uniqueEvents = []
      const seenIds = new Set()

      for (const event of eventsData) {
        const eventId = event.id || event.slug || `${event.title}-${event.startDate}`
        if (!seenIds.has(eventId)) {
          seenIds.add(eventId)
          uniqueEvents.push(event)
        }
      }

      // Sort by date (newest first)
      uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.startDate || a.createdAt || a.created_at || a.endDate || a.endDate_iso || a.endDateISO || a.closesAt || 0)
        const dateB = new Date(b.startDate || b.createdAt || b.created_at || b.endDate || b.endDate_iso || b.endDateISO || b.closesAt || 0)
        return dateB - dateA // Newest first
      })

      if (append) {
        setEvents(prev => {
          // Create a Set of existing event IDs to check for duplicates
          const existingIds = new Set(prev.map(e => e.id || e.slug || `${e.title}-${e.startDate}`))
          // Filter out duplicates from new events
          const newUniqueEvents = uniqueEvents.filter(e => {
            const eventId = e.id || e.slug || `${e.title}-${e.startDate}`
            return !existingIds.has(eventId)
          })
          return [...prev, ...newUniqueEvents]
        })
      } else {
        setEvents(uniqueEvents)
      }

      // Check if there are more items
      setHasMore(uniqueEvents.length === limit)

      if (uniqueEvents.length === 0 && page === 1) {
        setError('No active events found for this category.')
      } else {
        const category = categories.find(cat => cat.tagId === tagId)
        if (category && uniqueEvents.length > 0 && page === 1) {
          saveToMyMarkets(category.name, 'category', tagId, category.name)
        }
      }
    } catch (err) {
      setError(
        err.message.includes('CORS')
          ? 'CORS error: Polymarket API may block requests from browser.'
          : `Failed to find events: ${err.message}. Try another category or check your internet connection.`
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleCategoryClick = async (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return

    setActiveCategory(categoryId)
    setSearchTerm(category.name)
    setError(null)
    setEvents([])
    setCurrentView('search')
    setCurrentPage(1)
    setHasMore(false)

    await searchEventsByTagId(category.tagId, 1)
  }

  const loadMoreEvents = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    
    if (activeCategory) {
      const category = categories.find(cat => cat.id === activeCategory)
      if (category) {
        await searchEventsByTagId(category.tagId, nextPage, true)
      }
    } else if (searchTerm) {
      await searchEventsWithKeyword(searchTerm, true, nextPage, true)
    }
  }, [loadingMore, hasMore, loading, currentPage, activeCategory, searchTerm])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're near the bottom of the page
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Load more when user is within 500px of the bottom
      if (scrollTop + windowHeight >= documentHeight - 500) {
        loadMoreEvents()
      }
    }

    // Throttle scroll events
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    // Only add listener if there are events and more to load
    if (events.length > 0 && hasMore && !loadingMore && !loading) {
      window.addEventListener('scroll', throttledHandleScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', throttledHandleScroll)
      }
    }
  }, [events.length, hasMore, loadingMore, loading, loadMoreEvents])

  const loadSavedMarket = async (market) => {
    setCurrentView('search')
    setActiveCategory(null)
    setError(null)
    setEvents([])

    if (market.queryType === 'category') {
      const category = categories.find(cat => cat.tagId === market.tagId)
      if (category) {
        setActiveCategory(category.id)
        setSearchTerm(category.name)
        await searchEventsByTagId(market.tagId)
      }
    } else {
      setSearchTerm(market.query)
      await searchEventsWithKeyword(market.query, true)
    }
  }


  const getAiKeywordSuggestion = async (originalQuery) => {
    const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
    const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
    
    if (!OPENROUTER_API_KEY) {
      return null
    }

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: 'You are an assistant for searching events on Polymarket. Convert the user query (in any language) into one short keyword in English. Examples: "I love crypto" → "crypto", "bitcoin" → "bitcoin", "politics" → "politics", "dota 2" → "dota2", "cs go" → "csgo". If the query is already in English and contains multiple words, extract the main keyword. Answer with ONLY one English word, no explanations, no quotes, no periods, no spaces, lowercase.'
            },
            {
              role: 'user',
              content: `User wrote: "${originalQuery}". Convert this to one English keyword for searching active events on Polymarket. If the query contains multiple words, extract the main keyword. Answer with ONLY one lowercase English word, no spaces.`
            }
          ],
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        const aiData = await response.json()
        let suggestedKeyword = aiData.choices?.[0]?.message?.content?.trim().toLowerCase() || null
        
        if (suggestedKeyword) {
          suggestedKeyword = suggestedKeyword
            .replace(/['"`.,!?;:]/g, '')
            .split(/\s+/)[0]
            .toLowerCase()
            .trim()
          
          if (suggestedKeyword) {
            return suggestedKeyword
          }
        }
        
        return null
      } else {
        return null
      }
    } catch (aiErr) {
      return null
    }
  }

  const getAiCategorySuggestion = async (originalQuery) => {
    const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
    const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
    
    if (!OPENROUTER_API_KEY) {
      return null
    }

    const availableCategories = categories.map(cat => cat.id).join(', ')
    
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: `You are an assistant for searching events on Polymarket. Map the user query to one of these categories: ${availableCategories}, or "all" if none match. Available categories: ${availableCategories}. Answer with ONLY the category ID (e.g., "crypto", "politics", "sports", "all"), no explanations, no quotes, lowercase.`
            },
            {
              role: 'user',
              content: `User wrote: "${originalQuery}". Map this to one Polymarket category: ${availableCategories}, or "all" if none match. Answer with ONLY the category ID, lowercase.`
            }
          ],
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        const aiData = await response.json()
        let suggestedCategory = aiData.choices?.[0]?.message?.content?.trim().toLowerCase() || null
        
        if (suggestedCategory) {
          suggestedCategory = suggestedCategory
            .replace(/['"`.,!?;:]/g, '')
            .split(/\s+/)[0]
            .toLowerCase()
            .trim()
          
          // Validate it's a real category
          if (categories.find(cat => cat.id === suggestedCategory) || suggestedCategory === 'all') {
            return suggestedCategory
          }
        }
        
        return null
      } else {
        return null
      }
    } catch (aiErr) {
      return null
    }
  }

  // Function to search for events by keyword (can be called without form)
  const searchEventsWithKeyword = async (keyword, skipAi = false, page = 1, append = false) => {
    if (!keyword || !keyword.trim()) {
      return
    }

    const searchQuery = keyword.trim()
    
    if (page === 1) {
      setLoading(true)
      setEvents([])
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const limit = itemsPerPage
      const offset = (page - 1) * itemsPerPage
      let suggestedKeyword = null
      
      // Use AI to suggest a keyword
      if (!skipAi) {
        suggestedKeyword = await getAiKeywordSuggestion(searchQuery)
      }
      
      // Use public-search endpoint
      const searchUrl = `/api/public-search?q=${encodeURIComponent(searchQuery)}&events_status=active&limit=${limit}&offset=${offset}`
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      let eventsData = []
      
      // Handle Polymarket API response format
      if (Array.isArray(data)) {
        eventsData = data
      } else if (data && typeof data === 'object') {
        if (data.data && Array.isArray(data.data)) {
          eventsData = data.data
        } else if (data.events && Array.isArray(data.events)) {
          eventsData = data.events
        } else if (data.results && Array.isArray(data.results)) {
          eventsData = data.results
        } else if (data.markets && Array.isArray(data.markets)) {
          eventsData = data.markets
        } else {
          const possibleKeys = ['results', 'data', 'markets', 'items', 'list']
          
          for (const key of possibleKeys) {
            if (data[key] && Array.isArray(data[key])) {
              eventsData = data[key]
              break
            }
          }
          
          if (eventsData.length === 0) {
            for (const key in data) {
              if (Array.isArray(data[key]) && data[key].length > 0) {
                eventsData = data[key]
                break
              }
            }
          }
        }
      }

      const uniqueEvents = []
      const seenIds = new Set()
      
      for (const event of eventsData) {
        const eventId = event.id || event.slug || `${event.title}-${event.startDate}`
        if (!seenIds.has(eventId)) {
          seenIds.add(eventId)
          uniqueEvents.push(event)
        }
      }
      
      eventsData = uniqueEvents

      // Sort by date (newest first)
      eventsData.sort((a, b) => {
        const dateA = new Date(a.startDate || a.createdAt || a.created_at || a.endDate || a.endDate_iso || a.endDateISO || a.closesAt || 0)
        const dateB = new Date(b.startDate || b.createdAt || b.created_at || b.endDate || b.endDate_iso || b.endDateISO || b.closesAt || 0)
        return dateB - dateA // Newest first
      })

      if (append) {
        setEvents(prev => {
          // Create a Set of existing event IDs to check for duplicates
          const existingIds = new Set(prev.map(e => e.id || e.slug || `${e.title}-${e.startDate}`))
          // Filter out duplicates from new events
          const newUniqueEvents = eventsData.filter(e => {
            const eventId = e.id || e.slug || `${e.title}-${e.startDate}`
            return !existingIds.has(eventId)
          })
          return [...prev, ...newUniqueEvents]
        })
      } else {
        setEvents(eventsData)
      }

      // Check if there are more items
      setHasMore(eventsData.length === limit)

      if (eventsData.length > 0 && !activeCategory && searchQuery && page === 1) {
        saveToMyMarkets(searchQuery, 'search')
      }

      if (eventsData.length === 0 && response.ok && page === 1) {
        if (!skipAi && !isAiRetry) {
          setAiSuggesting(true)
          setError('Events not found. AI is analyzing your query...')
          
          const suggestedKeyword = await getAiKeywordSuggestion(searchQuery)
          
          if (suggestedKeyword && suggestedKeyword !== searchQuery.toLowerCase()) {
            setSearchTerm(suggestedKeyword)
            setError(null)
            setAiSuggesting(false)
            setIsAiRetry(true)
            
            setLoading(false)
            await searchEventsWithKeyword(suggestedKeyword, true, 1)
            return
          } else {
            setAiSuggesting(false)
            setIsAiRetry(false)
            setError('Events not found. Try another search query.')
          }
        } else {
          setAiSuggesting(false)
          setIsAiRetry(false)
          setError('Events not found. Try another search query.')
        }
      } else {
        setIsAiRetry(false)
        if (searchQuery && !activeCategory && eventsData.length > 0 && page === 1) {
          saveToMyMarkets(searchQuery, 'search')
        }
      }
    } catch (err) {
      setError(
        err.message.includes('CORS') 
          ? 'CORS error: Polymarket API may block requests from browser. You may need to configure a proxy server or use another method to access the API.'
          : `Failed to find events: ${err.message}. Try another search query or check your internet connection.`
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setIsAiRetry(false)
    }
  }

  const searchEvents = async (e) => {
    e.preventDefault()
    
    if (!searchTerm.trim()) {
      return
    }

    const originalQuery = searchTerm.trim()
    
    setIsAiRetry(false)
    setActiveCategory(null)
    setLoading(true)
    setError(null)
    setEvents([])
    setCurrentPage(1)
    setHasMore(false)
    
    setAiSuggesting(true)
    
    try {
      const suggestedKeyword = await getAiKeywordSuggestion(originalQuery)
      
      if (suggestedKeyword) {
        setSearchTerm(suggestedKeyword)
        setAiSuggesting(false)
        
        await searchEventsWithKeyword(suggestedKeyword, true, 1)
      } else {
        setAiSuggesting(false)
        await searchEventsWithKeyword(originalQuery, true, 1)
      }
    } catch (err) {
      setAiSuggesting(false)
      await searchEventsWithKeyword(originalQuery, true, 1)
    }
  }

  const handleLogoClick = () => {
    setCurrentView('home')
    setActiveCategory(null)
    setSearchTerm('')
    setEvents([])
    setError(null)
    setCurrentPage(1)
    setHasMore(false)
    // Scroll to top of the document
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <Navbar onLogoClick={handleLogoClick} />
      
      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <LightPillar
    topColor="#a91e3b"
    bottomColor="#b9afae"
    intensity={1.0}
    rotationSpeed={0.2}
    glowAmount={0.002}
    pillarWidth={5.0}
    pillarHeight={0.4}
    noiseIntensity={0.5}
    pillarRotation={110}
    interactive={false}
    mixBlendMode="normal"
  />

        {(currentView === 'search' || currentView === 'home') && (
          <Sidebar 
            categories={categories}
            onCategoryClick={handleCategoryClick}
            activeCategory={activeCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSearch={searchEvents}
            loading={loading}
            aiSuggesting={aiSuggesting}
            myMarkets={myMarkets}
            onTogglePin={togglePinMarket}
            onRemoveMarket={removeMarket}
            onLoadMarket={loadSavedMarket}
            onClearAllMarkets={clearAllMarkets}
            onOpenSearchPage={() => {
              setCurrentView('home')
              setActiveCategory(null)
              setEvents([])
              setError(null)
            }}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}
        
        <div className="container">
          {!activeCategory && (currentView === 'home' || currentView === 'search') && (
            <div className="search-page-container">
              <div className="search-page-content">
                <div className="hero-block">
                  <div className="hero-content-wrapper">
                    <div className="hero-left">
                      <h1 className="hero-title">
                        AI powered market search
                      </h1>
                      <p className="hero-description">
                        PulsePoly is the <strong>intelligent search layer</strong> for prediction markets on Polymarket.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  </div>
                <div className="search-section-wrapper">
                  {currentView === 'home' && (
                    <div className="featured-categories">
                      <h2 className="featured-categories-title">Featured Categories</h2>
                      <div className="featured-categories-grid">
                        {[
                          { 
                            id: 'politics', 
                            name: 'Politics', 
                            icon: (
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="7" width="18" height="14" rx="2" ry="2"></rect>
                                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="12" y1="12" x2="12" y2="12"></line>
                              </svg>
                            )
                          },
                          { 
                            id: 'crypto', 
                            name: 'Crypto', 
                            icon: <img src={CryptoIcon} alt="Crypto" style={{ width: '40px', height: '40px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
                          },
                          { 
                            id: 'sports', 
                            name: 'Sports', 
                            icon: <img src={SportsIcon} alt="Sports" style={{ width: '40px', height: '40px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
                          },
                          { 
                            id: 'movies', 
                            name: 'Movies', 
                            icon: <img src={MoviesIcon} alt="Pop culture" style={{ width: '40px', height: '40px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
                          },
                          { 
                            id: 'technology', 
                            name: 'Tech', 
                            icon: (
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                              </svg>
                            )
                          }
                        ].map((category) => (
                          <div
                            key={category.id}
                            className="featured-category-card"
                            onClick={() => handleCategoryClick(category.id)}
                          >
                            <div className="featured-category-icon">{category.icon}</div>
                            <div className="featured-category-name">{category.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!searchTerm || events.length === 0) && (
                    <h1 className="search-page-title">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', marginTop: '-2px' }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                      Find Events
                    </h1>
                  )}
                  <ExampleQueries onQueryClick={(query) => {
                    setSearchTerm(query)
                    setTimeout(() => searchEvents(), 100)
                  }} />
                  <form onSubmit={(e) => e.preventDefault()} className="search-page-form">
                    <div className="search-page-input-wrapper">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                          }
                        }}
                        placeholder="Enter search query..."
                        className="search-page-input"
                        disabled={loading}
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={searchEvents}
                        className="search-page-button"
                        disabled={loading || !searchTerm.trim()}
                      >
                        {aiSuggesting ? '🤖 AI analyzing...' : loading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </form>
                  {!activeCategory && currentView === 'home' && ((events.length > 0 || loading) && searchTerm) && (
                    <div className="events-container">
                      {!loading && searchTerm && (
                        <h2 className="events-title">
                          Events found: {events.length}
                        </h2>
                      )}
                      <div className="events-grid">
                {loading && events.length === 0 && (
                  <>
                    {[...Array(12)].map((_, i) => (
                      <div key={`skeleton-home-${i}`} className="event-card-skeleton">
                        <div className="skeleton-header"></div>
                        <div className="skeleton-title"></div>
                        <div className="skeleton-description"></div>
                        <div className="skeleton-description short"></div>
                        <div className="skeleton-stats">
                          <div className="skeleton-stat"></div>
                          <div className="skeleton-stat"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {events.map((event, index) => {
                  const uniqueKey = event.id ? `event-${event.id}-${index}` : 
                                  event.slug ? `event-${event.slug}-${index}` : 
                                  `event-${index}-${event.title?.substring(0, 20) || 'unknown'}`
                  
                  return (
                    <div 
                      key={uniqueKey} 
                      className="event-card"
                      onClick={() => openEventDetail(event)}
                      style={{ cursor: 'pointer' }}
                    >
                      {(event.id || event.slug) && (
                        <div className="event-id">
                          {String(event.id || event.slug)}
                        </div>
                      )}
                      <h3 className="event-question">
                        {event.question || event.title || 'No title'}
                      </h3>
                      
                      {event.description && typeof event.description === 'string' && (
                        <p className="event-description">
                          {event.description.length > 150 
                            ? event.description.substring(0, 150) + '...' 
                            : event.description}
                        </p>
                      )}

                      <div className="event-details">
                        {(() => {
                          let outcomes = null
                          if (event.markets && event.markets.length > 0 && event.markets[0].outcomes) {
                            const marketOutcomes = event.markets[0].outcomes
                            if (typeof marketOutcomes === 'string') {
                              try {
                                outcomes = JSON.parse(marketOutcomes)
                              } catch (e) {
                                outcomes = null
                              }
                            } else if (Array.isArray(marketOutcomes)) {
                              outcomes = marketOutcomes
                            }
                          } else if (event.outcomes) {
                            if (typeof event.outcomes === 'string') {
                              try {
                                outcomes = JSON.parse(event.outcomes)
                              } catch (e) {
                                outcomes = null
                              }
                            } else if (Array.isArray(event.outcomes)) {
                              outcomes = event.outcomes
                            } else if (typeof event.outcomes === 'object') {
                              outcomes = Object.keys(event.outcomes)
                            }
                          }
                          
                          const marketCount = event.markets && Array.isArray(event.markets) ? event.markets.length : 
                                             (event.outcomeOptions && Array.isArray(event.outcomeOptions) ? event.outcomeOptions.length : 
                                              (outcomes && Array.isArray(outcomes) ? outcomes.length : 0))
                          
                          let outcomeOptions = []
                          
                          if (event.outcomeOptions && Array.isArray(event.outcomeOptions) && event.outcomeOptions.length > 0) {
                            outcomeOptions = event.outcomeOptions
                          } else if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
                            outcomeOptions = event.markets.map((market, i) => {
                              let outcomeName = 'Unknown'
                              if (market.groupItemTitle) {
                                outcomeName = market.groupItemTitle
                              } else if (market.groupItemtitle) {
                                outcomeName = market.groupItemtitle
                              } else if (market.question) {
                                outcomeName = market.question
                              } else if (market.title) {
                                outcomeName = market.title
                              } else if (market.metadata && market.metadata.title) {
                                outcomeName = market.metadata.title
                              } else if (market.name) {
                                outcomeName = market.name
                              } else if (market.metadata && market.metadata.question) {
                                outcomeName = market.metadata.question
                              } else if (market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0) {
                                outcomeName = market.outcomes[0]
                              } else if (market.outcomes && typeof market.outcomes === 'string') {
                                try {
                                  const parsed = JSON.parse(market.outcomes)
                                  outcomeName = Array.isArray(parsed) ? parsed[0] : parsed
                                } catch (e) {
                                  outcomeName = market.outcomes
                                }
                              } else if (outcomes && Array.isArray(outcomes) && outcomes[i]) {
                                outcomeName = typeof outcomes[i] === 'string' ? outcomes[i] : outcomes[i].name || outcomes[i].title || 'Unknown'
                              }
                              
                              let percent = 50
                              let price = 0.5
                              
                              if (market.outcomePrices && Array.isArray(market.outcomePrices) && market.outcomePrices.length > 0) {
                                const rawPrice = parseFloat(market.outcomePrices[0])
                                if (!isNaN(rawPrice)) {
                                  if (rawPrice > 1) {
                                    percent = Math.round(rawPrice)
                                    price = percent / 100
                                  } else {
                                    price = rawPrice
                                    percent = Math.round(price * 100)
                                  }
                                }
                              } else if (market.outcomePrices && typeof market.outcomePrices === 'string') {
                                try {
                                  const parsed = JSON.parse(market.outcomePrices)
                                  if (Array.isArray(parsed) && parsed[0] !== undefined) {
                                    const rawPrice = parseFloat(parsed[0])
                                    if (!isNaN(rawPrice)) {
                                      if (rawPrice > 1) {
                                        percent = Math.round(rawPrice)
                                        price = percent / 100
                                      } else {
                                        price = rawPrice
                                        percent = Math.round(price * 100)
                                      }
                                    }
                                  }
                                } catch (e) {
                                }
                              } else if (market.price !== undefined) {
                                price = parseFloat(market.price) || 0.5
                                percent = Math.round(price * 100)
                              } else if (market.yesPrice !== undefined) {
                                price = parseFloat(market.yesPrice) || 0.5
                                percent = Math.round(price * 100)
                              } else if (market.probability !== undefined) {
                                percent = Math.round(parseFloat(market.probability) * 100)
                                price = percent / 100
                              } else if (market.yesPercent !== undefined) {
                                percent = Math.round(parseFloat(market.yesPercent))
                                price = percent / 100
                              }
                              
                              if (percent < 0) percent = 0
                              if (percent > 100) percent = 100
                              if (percent === 0 && price > 0 && price < 0.01) {
                                percent = Math.max(0, Math.round(price * 100))
                              }
                              
                              return {
                                name: outcomeName,
                                percent: percent,
                                yesPrice: (percent / 100),
                                noPrice: (1 - percent / 100)
                              }
                            })
                          } else if (outcomes && Array.isArray(outcomes) && outcomes.length > 0) {
                            const outcomeNames = outcomes.map(outcome => 
                              typeof outcome === 'string' ? outcome : outcome.name || outcome.title || JSON.stringify(outcome)
                            )
                            
                            let outcomePrices = null
                            if (event.markets && event.markets.length > 0 && event.markets[0].outcomePrices) {
                              const marketOutcomePrices = event.markets[0].outcomePrices
                              if (typeof marketOutcomePrices === 'string') {
                                try {
                                  outcomePrices = JSON.parse(marketOutcomePrices)
                                } catch (e) {
                                  outcomePrices = null
                                }
                              } else if (Array.isArray(marketOutcomePrices)) {
                                outcomePrices = marketOutcomePrices
                              }
                            }
                            
                            outcomeOptions = outcomeNames.map((name, i) => {
                              let percent = 0
                              if (outcomePrices && outcomePrices[i] !== undefined) {
                                percent = Math.round(parseFloat(outcomePrices[i]) * 100)
                              } else if (outcomeNames.length > 0) {
                                percent = Math.round(100 / outcomeNames.length)
                              }
                              return {
                                name: name,
                                percent: percent,
                                yesPrice: (percent / 100),
                                noPrice: (1 - percent / 100)
                              }
                            })
                          }
                          
                          if (outcomeOptions.length > 0) {
                            const sortedOutcomes = [...outcomeOptions].sort((a, b) => b.percent - a.percent)
                            
                            if (marketCount === 1) {
                              const firstOutcome = sortedOutcomes[0]
                              const yesPercent = firstOutcome.percent || 50
                              const noPercent = 100 - yesPercent
                              
                              return (
                                <div className="event-binary-outcomes">
                                  <div className="binary-progress-bar">
                                    <div className="binary-progress-labels">
                                      <span className="binary-label-yes">Yes {yesPercent}%</span>
                                      <span className="binary-label-no">No {noPercent}%</span>
                                    </div>
                                    <div className="binary-progress-track">
                                      <div 
                                        className="binary-progress-fill-yes" 
                                        style={{ width: `${yesPercent}%` }}
                                      ></div>
                                      <div 
                                        className="binary-progress-fill-no" 
                                        style={{ width: `${noPercent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            
                            const topTwoOutcomes = sortedOutcomes.slice(0, 2)
                            const showSeeMore = sortedOutcomes.length > 2
                            
                            return (
                              <div className="event-outcomes-list">
                                {topTwoOutcomes.map((option, i) => (
                                  <div key={i} className="event-outcome-row">
                                    <div className="outcome-name-left">
                                      {option.name}
                                    </div>
                                    <div className="outcome-actions-right">
                                      <span className="outcome-percent">{option.percent}%</span>
                                      <div className="outcome-yes-no-buttons">
                                        <a
                                          href={`https://polymarket.com/event/${event.slug || event.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="outcome-yes-btn"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Yes
                                        </a>
                                        <span className="outcome-separator">/</span>
                                        <a
                                          href={`https://polymarket.com/event/${event.slug || event.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="outcome-no-btn"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          No
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {showSeeMore && (
                                  <div className="see-more-link" onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}>
                                    See more
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        })()}
                        <div className="event-stats-row">
                          {(event.volume || event.volumeClob || event.volumeUsd || event.totalVolume) && (
                            <div className="event-stat-item">
                              <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                              </svg>
                              <span className="stat-value">$
                                {parseFloat(event.volume || event.volumeClob || event.volumeUsd || event.totalVolume || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(event.endDate || event.endDate_iso || event.endDateISO || event.closesAt) && (
                            <div className="event-stat-item">
                              <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <span className="stat-value">
                                {new Date(event.endDate || event.endDate_iso || event.endDateISO || event.closesAt).toLocaleDateString('en-US')}
                              </span>
                            </div>
                          )}
                          {(event.uniqueTraders || event.traders || event.participants || event.userCount || event.bettors || event.uniqueUsers || (event.markets && event.markets[0] && (event.markets[0].uniqueTraders || event.markets[0].traders))) && (
                            <div className="event-stat-item">
                              <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                              <span className="stat-value">
                                {parseInt(event.uniqueTraders || event.traders || event.participants || event.userCount || event.bettors || event.uniqueUsers || (event.markets && event.markets[0] && (event.markets[0].uniqueTraders || event.markets[0].traders)) || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        {event.slug && (
                          <a 
                            href={`https://polymarket.com/event/${event.slug || event.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Open on Polymarket</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
                {loadingMore && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <div key={`skeleton-more-home-${i}`} className="event-card-skeleton">
                        <div className="skeleton-header"></div>
                        <div className="skeleton-title"></div>
                        <div className="skeleton-description"></div>
                        <div className="skeleton-description short"></div>
                        <div className="skeleton-stats">
                          <div className="skeleton-stat"></div>
                          <div className="skeleton-stat"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedEvent && (
            <EventDetail 
              event={selectedEvent}
              loading={eventDetailLoading}
              error={eventDetailError}
              onBack={closeEventDetail}
            />
          )}

          {currentView === 'search' && (
            <>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {((events.length > 0 || loading) && (searchTerm || activeCategory)) && (
          <div className="events-container">
            {!activeCategory && !loading && searchTerm && (
              <h2 className="events-title">
                Events found: {events.length}
              </h2>
            )}
            <div className="events-grid">
              {loading && events.length === 0 && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <div key={`skeleton-${i}`} className="event-card-skeleton">
                      <div className="skeleton-header"></div>
                      <div className="skeleton-title"></div>
                      <div className="skeleton-description"></div>
                      <div className="skeleton-description short"></div>
                      <div className="skeleton-stats">
                        <div className="skeleton-stat"></div>
                        <div className="skeleton-stat"></div>
                      </div>
                    </div>
                  ))}
                </>
              )}
               {events.map((event, index) => {
                 const uniqueKey = event.id ? `event-${event.id}-${index}` : 
                                  event.slug ? `event-${event.slug}-${index}` : 
                                  `event-${index}-${event.title?.substring(0, 20) || 'unknown'}`
                 
                 return (
                 <div 
                   key={uniqueKey} 
                   className="event-card"
                   onClick={() => openEventDetail(event)}
                   style={{ cursor: 'pointer' }}
                 >
                  {(event.id || event.slug) && (
                    <div className="event-id">
                      {String(event.id || event.slug)}
                    </div>
                  )}
                  <h3 className="event-question">
                    {event.question || event.title || 'No title'}
                  </h3>
                  
                    {event.description && typeof event.description === 'string' && (
                      <p className="event-description">
                        {event.description.length > 150 
                          ? event.description.substring(0, 150) + '...' 
                          : event.description}
                      </p>
                    )}

                  <div className="event-details">
                    {(() => {
                      let outcomes = null
                      if (event.markets && event.markets.length > 0 && event.markets[0].outcomes) {
                        const marketOutcomes = event.markets[0].outcomes
                        if (typeof marketOutcomes === 'string') {
                          try {
                            outcomes = JSON.parse(marketOutcomes)
                          } catch (e) {
                            outcomes = null
                          }
                        } else if (Array.isArray(marketOutcomes)) {
                          outcomes = marketOutcomes
                        }
                      } else if (event.outcomes) {
                        if (typeof event.outcomes === 'string') {
                          try {
                            outcomes = JSON.parse(event.outcomes)
                          } catch (e) {
                            outcomes = null
                          }
                        } else if (Array.isArray(event.outcomes)) {
                          outcomes = event.outcomes
                        } else if (typeof event.outcomes === 'object') {
                          outcomes = Object.keys(event.outcomes)
                        }
                      }
                      
                      // Count number of markets
                      const marketCount = event.markets && Array.isArray(event.markets) ? event.markets.length : 
                                         (event.outcomeOptions && Array.isArray(event.outcomeOptions) ? event.outcomeOptions.length : 
                                          (outcomes && Array.isArray(outcomes) ? outcomes.length : 0))
                      
                      // Get outcome options (for Jupiter) or calculate from outcomes (for Polymarket)
                      let outcomeOptions = []
                      
                      // Check if event has outcomeOptions (Jupiter format)
                      if (event.outcomeOptions && Array.isArray(event.outcomeOptions) && event.outcomeOptions.length > 0) {
                        outcomeOptions = event.outcomeOptions
                      } else if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
                        // Polymarket format - get outcome names from each market
                        outcomeOptions = event.markets.map((market, i) => {
                          // Try to get market title/question - this is what should be displayed
                          let outcomeName = 'Unknown'
                          // Priority: groupItemTitle/groupItemtitle, then question, then title, then metadata.title, then name
                          if (market.groupItemTitle) {
                            outcomeName = market.groupItemTitle
                          } else if (market.groupItemtitle) {
                            outcomeName = market.groupItemtitle
                          } else if (market.question) {
                            outcomeName = market.question
                          } else if (market.title) {
                            outcomeName = market.title
                          } else if (market.metadata && market.metadata.title) {
                            outcomeName = market.metadata.title
                          } else if (market.name) {
                            outcomeName = market.name
                          } else if (market.metadata && market.metadata.question) {
                            outcomeName = market.metadata.question
                          } else if (market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0) {
                            outcomeName = market.outcomes[0]
                          } else if (market.outcomes && typeof market.outcomes === 'string') {
                            try {
                              const parsed = JSON.parse(market.outcomes)
                              outcomeName = Array.isArray(parsed) ? parsed[0] : parsed
                            } catch (e) {
                              outcomeName = market.outcomes
                            }
                          } else if (outcomes && Array.isArray(outcomes) && outcomes[i]) {
                            outcomeName = typeof outcomes[i] === 'string' ? outcomes[i] : outcomes[i].name || outcomes[i].title || 'Unknown'
                          }
                          
                          // Get percentage from market prices - prioritize outcomePrices
                          let percent = 50
                          let price = 0.5
                          
                          // Priority: outcomePrices field
                          if (market.outcomePrices && Array.isArray(market.outcomePrices) && market.outcomePrices.length > 0) {
                            // Use first price from outcomePrices array (this is the "Yes" price)
                            const rawPrice = parseFloat(market.outcomePrices[0])
                            if (!isNaN(rawPrice)) {
                              // If price is already > 1, it might be in percentage format, otherwise it's 0-1
                              if (rawPrice > 1) {
                                percent = Math.round(rawPrice)
                                price = percent / 100
                              } else {
                                price = rawPrice
                                percent = Math.round(price * 100)
                              }
                            }
                          } else if (market.outcomePrices && typeof market.outcomePrices === 'string') {
                            try {
                              const parsed = JSON.parse(market.outcomePrices)
                              if (Array.isArray(parsed) && parsed[0] !== undefined) {
                                const rawPrice = parseFloat(parsed[0])
                                if (!isNaN(rawPrice)) {
                                  if (rawPrice > 1) {
                                    percent = Math.round(rawPrice)
                                    price = percent / 100
                                  } else {
                                    price = rawPrice
                                    percent = Math.round(price * 100)
                                  }
                                }
                              }
                            } catch (e) {
                              // Keep default
                            }
                          } else if (market.price !== undefined) {
                            price = parseFloat(market.price) || 0.5
                            percent = Math.round(price * 100)
                          } else if (market.yesPrice !== undefined) {
                            price = parseFloat(market.yesPrice) || 0.5
                            percent = Math.round(price * 100)
                          } else if (market.probability !== undefined) {
                            percent = Math.round(parseFloat(market.probability) * 100)
                            price = percent / 100
                          } else if (market.yesPercent !== undefined) {
                            percent = Math.round(parseFloat(market.yesPercent))
                            price = percent / 100
                          }
                          
                          // Ensure percent is between 0 and 100
                          if (percent < 0) percent = 0
                          if (percent > 100) percent = 100
                          // Handle very small percentages (< 1%)
                          if (percent === 0 && price > 0 && price < 0.01) {
                            percent = Math.max(0, Math.round(price * 100))
                          }
                          
                          return {
                            name: outcomeName,
                            percent: percent,
                            yesPrice: (percent / 100),
                            noPrice: (1 - percent / 100)
                          }
                        })
                      } else if (outcomes && Array.isArray(outcomes) && outcomes.length > 0) {
                        // Fallback: use outcomes array
                        const outcomeNames = outcomes.map(outcome => 
                          typeof outcome === 'string' ? outcome : outcome.name || outcome.title || JSON.stringify(outcome)
                        )
                        
                        // Get outcome prices if available
                        let outcomePrices = null
                        if (event.markets && event.markets.length > 0 && event.markets[0].outcomePrices) {
                          const marketOutcomePrices = event.markets[0].outcomePrices
                          if (typeof marketOutcomePrices === 'string') {
                            try {
                              outcomePrices = JSON.parse(marketOutcomePrices)
                            } catch (e) {
                              outcomePrices = null
                            }
                          } else if (Array.isArray(marketOutcomePrices)) {
                            outcomePrices = marketOutcomePrices
                          }
                        }
                        
                        // Create outcome options with percentages
                        outcomeOptions = outcomeNames.map((name, i) => {
                          let percent = 0
                          if (outcomePrices && outcomePrices[i] !== undefined) {
                            percent = Math.round(parseFloat(outcomePrices[i]) * 100)
                          } else if (outcomeNames.length > 0) {
                            // Default equal distribution
                            percent = Math.round(100 / outcomeNames.length)
                          }
                          return {
                            name: name,
                            percent: percent,
                            yesPrice: (percent / 100),
                            noPrice: (1 - percent / 100)
                          }
                        })
                      }
                      
                      if (outcomeOptions.length > 0) {
                        // Sort outcomes by probability (descending) to get most probable first
                        const sortedOutcomes = [...outcomeOptions].sort((a, b) => b.percent - a.percent)
                        
                        // 1 market: show big Yes/No buttons with progress bar
                        if (marketCount === 1) {
                          const firstOutcome = sortedOutcomes[0]
                          const yesPercent = firstOutcome.percent || 50
                          const noPercent = 100 - yesPercent
                          
                          return (
                            <div className="event-binary-outcomes">
                              <div className="binary-progress-bar">
                                <div className="binary-progress-labels">
                                  <span className="binary-label-yes">Yes {yesPercent}%</span>
                                  <span className="binary-label-no">No {noPercent}%</span>
                                </div>
                                <div className="binary-progress-track">
                                  <div 
                                    className="binary-progress-fill-yes" 
                                    style={{ width: `${yesPercent}%` }}
                                  ></div>
                                  <div 
                                    className="binary-progress-fill-no" 
                                    style={{ width: `${noPercent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        
                        // Show top 2 most probable outcomes for all other cases
                        const topTwoOutcomes = sortedOutcomes.slice(0, 2)
                        const showSeeMore = sortedOutcomes.length > 2
                        
                        return (
                          <div className="event-outcomes-list">
                            {topTwoOutcomes.map((option, i) => (
                              <div key={i} className="event-outcome-row">
                                <div className="outcome-name-left">
                                  {option.name}
                                </div>
                                <div className="outcome-actions-right">
                                  <span className="outcome-percent">{option.percent}%</span>
                                  <div className="outcome-yes-no-buttons">
                                    <a
                                      href={`https://polymarket.com/event/${event.slug || event.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="outcome-yes-btn"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Yes
                                    </a>
                                    <span className="outcome-separator">/</span>
                                    <a
                                      href={`https://polymarket.com/event/${event.slug || event.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="outcome-no-btn"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      No
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {showSeeMore && (
                              <div className="see-more-link" onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}>
                                See more
                              </div>
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}

                    <div className="event-stats-row">
                      {(event.volume || event.volumeClob || event.volumeUsd || event.totalVolume) && (
                        <div className="event-stat-item">
                          <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                          </svg>
                          <span className="stat-value">$
                            {parseFloat(event.volume || event.volumeClob || event.volumeUsd || event.totalVolume || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {(event.endDate || event.endDate_iso || event.endDateISO || event.closesAt) && (
                        <div className="event-stat-item">
                          <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span className="stat-value">
                            {new Date(event.endDate || event.endDate_iso || event.endDateISO || event.closesAt).toLocaleDateString('en-US')}
                          </span>
                        </div>
                      )}
                      {(event.uniqueTraders || event.traders || event.participants || event.userCount || event.bettors || event.uniqueUsers || (event.markets && event.markets[0] && (event.markets[0].uniqueTraders || event.markets[0].traders))) && (
                        <div className="event-stat-item">
                          <svg className="stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          <span className="stat-value">
                            {parseInt(event.uniqueTraders || event.traders || event.participants || event.userCount || event.bettors || event.uniqueUsers || (event.markets && event.markets[0] && (event.markets[0].uniqueTraders || event.markets[0].traders)) || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {event.slug && (
                      <a 
                        href={`https://polymarket.com/event/${event.slug || event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Open on Polymarket</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                     )}
                   </div>
                 </div>
               )
               })}
               {loadingMore && (
                 <>
                   {[...Array(6)].map((_, i) => (
                     <div key={`skeleton-more-${i}`} className="event-card-skeleton">
                       <div className="skeleton-header"></div>
                       <div className="skeleton-title"></div>
                       <div className="skeleton-description"></div>
                       <div className="skeleton-description short"></div>
                       <div className="skeleton-stats">
                         <div className="skeleton-stat"></div>
                         <div className="skeleton-stat"></div>
                       </div>
                     </div>
                   ))}
                 </>
               )}
            </div>
          </div>
        )}

        {!loading && !error && events.length === 0 && searchTerm && (
          <div className="no-results">
            Events not found. Try another search query.
          </div>
        )}
            </>
          )}
        </div>
      </div>
      
      <Footer 
        currentView={currentView}
        loading={loading}
        loadingMore={loadingMore}
        eventDetailLoading={eventDetailLoading}
        selectedEvent={selectedEvent}
      />
    </div>
  )
}

// Example Queries Component
function ExampleQueries({ onQueryClick }) {
  const exampleQueries = [
    'bitcoin',
    'ethereum',
    'crypto',
    'politics',
    'election',
    'sports',
    'basketball',
    'football',
    'nba',
    'nfl',
    'trump',
    'biden',
    'ai',
    'technology',
    'movies',
    'gaming',
    'esports',
    'valorant',
    'csgo',
    'dota',
    'weather',
    'science',
    'space',
    'stock market',
    'economy'
  ]

  // Shuffle and take 6 random queries - use useMemo to prevent re-shuffling on every render
  const shuffled = useMemo(() => {
    return [...exampleQueries].sort(() => Math.random() - 0.5).slice(0, 6)
  }, [])

  return (
    <div className="example-queries">
      {shuffled.map((query, index) => (
        <span
          key={index}
          className="example-query"
          onClick={() => onQueryClick(query)}
        >
          {query}
          {index < shuffled.length - 1 && <span className="query-separator"> • </span>}
        </span>
      ))}
    </div>
  )
}

export default App

//https://prediction-market-api.jup.ag/api/v1/events?start=0&end=9&category=all&includeMarkets=true&sortBy=volume&sortDirection=desc
//https://prediction-market-api.jup.ag/api/v1/events?start=0&end=9&category=all&includeMarkets=true&sortBy=volume&sortDirection=desc
