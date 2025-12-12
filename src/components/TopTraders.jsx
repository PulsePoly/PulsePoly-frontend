import React, { useState, useEffect } from 'react'
import './TopTraders.css'

function TopTraders() {
  const [traders, setTraders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('all') // all, month, week

  useEffect(() => {
    fetchTopTraders()
  }, [timeframe])

  const fetchTopTraders = async () => {
    setLoading(true)
    setError(null)

    try {
      // Using Polymarket Data API for leaderboard
      // API: https://data-api.polymarket.com/v1/leaderboard
      const response = await fetch(`/api/leaderboard?timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Leaderboard data:', data)
      
      // Process and format trader data
      let tradersData = []
      if (Array.isArray(data)) {
        tradersData = data
      } else if (data.leaderboard && Array.isArray(data.leaderboard)) {
        tradersData = data.leaderboard
      } else if (data.data && Array.isArray(data.data)) {
        tradersData = data.data
      } else if (data.rankings && Array.isArray(data.rankings)) {
        tradersData = data.rankings
      }

      // Sort by profit/volume (already sorted by API but just in case)
      tradersData.sort((a, b) => {
        const profitA = parseFloat(a.totalProfit || a.profit || a.pnl || a.realizedProfit || 0)
        const profitB = parseFloat(b.totalProfit || b.profit || b.pnl || b.realizedProfit || 0)
        return profitB - profitA
      })

      // Limit to top 100
      setTraders(tradersData.slice(0, 100))
    } catch (err) {
      console.error('Error fetching top traders:', err)
      setError(err.message || 'Failed to load top traders')
      
      // Set mock data for demonstration if API fails
      setTraders(generateMockTraders())
    } finally {
      setLoading(false)
    }
  }

  const generateMockTraders = () => {
    // Generate mock data for demonstration
    return Array.from({ length: 50 }, (_, i) => {
      const randomAddress = `0x${Math.random().toString(16).substr(2, 40)}`
      const randomNames = ['CryptoKing', 'MarketMaster', 'TradeWizard', 'BullRunner', 'DiamondHands', 'MoonShot', 'WhaleWatcher', 'DeFiLord', 'TokenTitan', 'ChartChaser']
      return {
        rank: i + 1,
        userName: i < 30 ? randomNames[i % randomNames.length] + (i > 9 ? i : '') : null, // Some traders have usernames
        proxyWallet: randomAddress, // PRIMARY: Use 'proxyWallet' to match Polymarket API
        account: randomAddress,
        address: randomAddress,
        totalProfit: Math.floor(Math.random() * 100000) + 10000,
        profit: Math.floor(Math.random() * 100000) + 10000,
        vol: Math.floor(Math.random() * 500000) + 50000, // PRIMARY: 'vol' matches Polymarket API
        totalVolume: Math.floor(Math.random() * 500000) + 50000,
        volume: Math.floor(Math.random() * 500000) + 50000,
        totalTrades: Math.floor(Math.random() * 1000) + 50,
        trades: Math.floor(Math.random() * 1000) + 50,
        winRate: (Math.random() * 30 + 50).toFixed(1),
      }
    })
  }

  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    if (address.length > 20) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
    return address
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatCurrency = (num) => {
    if (!num) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num)
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-gold'
    if (rank === 2) return 'rank-silver'
    if (rank === 3) return 'rank-bronze'
    return ''
  }

  return (
    <div className="top-traders-container">
      <div className="top-traders-header">
        <div className="top-traders-title-section">
          <h1 className="top-traders-title">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Top Traders Leaderboard
          </h1>
          <p className="top-traders-subtitle">
            Most profitable traders on Polymarket
          </p>
        </div>

        <div className="top-traders-filters">
          <button
            className={`filter-button ${timeframe === 'all' ? 'active' : ''}`}
            onClick={() => setTimeframe('all')}
          >
            All Time
          </button>
          <button
            className={`filter-button ${timeframe === 'month' ? 'active' : ''}`}
            onClick={() => setTimeframe('month')}
          >
            This Month
          </button>
          <button
            className={`filter-button ${timeframe === 'week' ? 'active' : ''}`}
            onClick={() => setTimeframe('week')}
          >
            This Week
          </button>
        </div>
      </div>

      {error && (
        <div className="top-traders-error">
          <p>⚠️ {error}</p>
          <p className="error-subtext">Showing demo data. Check console for details.</p>
        </div>
      )}

      {loading && traders.length === 0 ? (
        <div className="top-traders-loading">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="trader-card-skeleton">
              <div className="skeleton-rank"></div>
              <div className="skeleton-info">
                <div className="skeleton-address"></div>
                <div className="skeleton-stats"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="top-traders-grid">
          {traders.map((trader, index) => {
            const rank = trader.rank || index + 1
            // Use proxyWallet for Polymarket profile links!
            const address = trader.proxyWallet || trader.account || trader.address || trader.user || trader.wallet || trader.userId || ''
            // Use userName for display!
            const username = trader.userName || trader.username || trader.name || null
            const profit = trader.totalProfit || trader.realizedProfit || trader.profit || trader.pnl || 0
            const volume = trader.vol || trader.totalVolume || trader.volume || trader.notionalVolume || 0
            const trades = trader.totalTrades || trader.trades || trader.tradesCount || trader.marketsTraded || 0
            const winRate = trader.winRate || trader.winningPercentage || trader.winRatio || 0

            // Debug log
            if (index < 3) {
              console.log(`Trader ${index}:`, {
                raw: trader,
                userName: trader.userName,
                username: username,
                proxyWallet: trader.proxyWallet,
                vol: trader.vol,
                extractedVolume: volume,
                extractedAddress: address
              })
            }

            return (
              <div key={index} className={`trader-card ${getRankClass(rank)}`}>
                <div className="trader-rank">
                  {getRankBadge(rank)}
                </div>

                <div className="trader-info">
                  <div className="trader-address-section">
                    {username ? (
                      <>
                        <span className="trader-username" title={`${username} (${address})`}>
                          {username}
                        </span>
                        <span className="trader-address-small" title={address}>
                          {formatAddress(address)}
                        </span>
                      </>
                    ) : (
                      <span className="trader-address" title={address}>
                        {formatAddress(address)}
                      </span>
                    )}
                    <button
                      className="trader-copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(address)
                      }}
                      title="Copy address"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="trader-stats">
                    <div className="trader-stat">
                      <span className="stat-label">Profit</span>
                      <span className={`stat-value ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                        {formatCurrency(profit)}
                      </span>
                    </div>

                    <div className="trader-stat">
                      <span className="stat-label">Volume</span>
                      <span className="stat-value">{formatCurrency(volume)}</span>
                    </div>

                    {winRate > 0 && (
                      <div className="trader-stat">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{winRate}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="trader-actions">
                  <a
                    href={address && address.length > 0 ? `https://polymarket.com/profile/${address}` : '#'}
                    target={address && address.length > 0 ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className={`trader-view-button ${!address || address.length === 0 ? 'trader-view-button-disabled' : ''}`}
                    onClick={(e) => {
                      if (!address || address.length === 0) {
                        e.preventDefault()
                        console.warn('No address available for this trader')
                      }
                    }}
                  >
                    View Profile
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && traders.length === 0 && !error && (
        <div className="top-traders-empty">
          <p>No traders found</p>
        </div>
      )}
    </div>
  )
}

export default TopTraders

