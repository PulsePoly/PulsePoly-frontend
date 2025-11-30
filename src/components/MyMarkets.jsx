import React from 'react'
import './MyMarkets.css'

function MyMarkets({ markets, onRemove, onTogglePin, onClearAll, onLoadMarket, onOpenEvent }) {
  if (markets.length === 0) {
    return (
      <div className="my-markets-container">
        <div className="my-markets-empty">
          <p>No saved markets</p>
          <span>Your search queries will be saved here</span>
        </div>
      </div>
    )
  }

  const pinnedMarkets = markets.filter(m => m.pinned)
  const unpinnedMarkets = markets.filter(m => !m.pinned)

  return (
    <div className="my-markets-container">
      <div className="my-markets-header">
        <h2>My Markets</h2>
        <button 
          className="clear-all-button"
          onClick={onClearAll}
          title="Clear all"
        >
          🗑️ Clear all
        </button>
      </div>

      <div className="markets-list">
        {pinnedMarkets.length > 0 && (
          <div className="markets-section">
            <h3 className="section-title">📌 Pinned</h3>
            {pinnedMarkets.map(market => (
              <MarketItem
                key={market.id}
                market={market}
                onRemove={onRemove}
                onTogglePin={onTogglePin}
                onLoad={onLoadMarket}
              />
            ))}
          </div>
        )}

        {unpinnedMarkets.length > 0 && (
          <div className="markets-section">
            {pinnedMarkets.length > 0 && (
              <h3 className="section-title">All Markets</h3>
            )}
            {unpinnedMarkets.map(market => (
              <MarketItem
                key={market.id}
                market={market}
                onRemove={onRemove}
                onTogglePin={onTogglePin}
                onLoad={onLoadMarket}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MarketItem({ market, onRemove, onTogglePin, onLoad }) {
  const displayName = market.categoryName || market.query || 'No name'
  const displayIcon = market.categoryIcon || (market.queryType === 'category' ? '📁' : '🔍')

  return (
    <div className={`market-item ${market.pinned ? 'pinned' : ''}`}>
      <button 
        className="market-content"
        onClick={() => onLoad(market)}
      >
        <span className="market-icon">{displayIcon}</span>
        <div className="market-info">
          <span className="market-name">{displayName}</span>
          <span className="market-date">
            {new Date(market.savedAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </button>
      <div className="market-actions">
        <button
          className={`action-button pin-button ${market.pinned ? 'pinned' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(market.id)
          }}
          title={market.pinned ? 'Unpin' : 'Pin'}
        >
          {market.pinned ? '📌' : '📍'}
        </button>
        <button
          className="action-button remove-button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(market.id)
          }}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default MyMarkets

