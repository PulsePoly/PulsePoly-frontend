import React, { useState } from 'react'
import './EventDetail.css'

function EventDetail({ event, onBack, loading, error }) {
  const [showMoreRules, setShowMoreRules] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showAllOutcomes, setShowAllOutcomes] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onBack()
    }, 300) // Match the animation duration
  }

  if (loading) {
    return (
      <div className={`event-detail-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
        <div className={`event-detail-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="event-detail-header">
            <button className="modal-close-button" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="event-detail-loading">
            <p>Loading event data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`event-detail-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
        <div className={`event-detail-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="event-detail-header">
            <button className="modal-close-button" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="event-detail-error">
            <p>Loading error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className={`event-detail-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
        <div className={`event-detail-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="event-detail-header">
            <button className="modal-close-button" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="event-detail-empty">
            <p>Event not found</p>
          </div>
        </div>
      </div>
    )
  }

  const markets = event.markets || []
  
  let outcomesData = []
  
  // Check if event has outcomeOptions (Jupiter format) - show ALL outcomes in modal
  if (event.outcomeOptions && Array.isArray(event.outcomeOptions) && event.outcomeOptions.length > 0) {
    outcomesData = event.outcomeOptions.map(option => {
      return {
        name: option.name,
        chance: option.percent,
        price: option.yesPrice,
        yesPrice: option.yesPrice,
        noPrice: option.noPrice,
        volume: 0,
        marketId: option.marketId
      }
    })
  } else if (markets && Array.isArray(markets) && markets.length > 0) {
    // Polymarket format - process ALL markets to show all outcomes
    outcomesData = markets.map((market, i) => {
      // Get market title/question - this is what should be displayed
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
      
      const volume = market.volumeNum || market.volume || 0
      const yesPrice = price
      const noPrice = 1 - price
      
      return {
        name: outcomeName,
        chance: percent,
        price: price,
        yesPrice: yesPrice,
        noPrice: noPrice,
        volume: volume,
        marketId: market.id || market.marketId
      }
    })
  } else if (event.outcomes) {
    // Fallback: use outcomes array if no markets
    let outcomes = null
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

    if (outcomes && Array.isArray(outcomes)) {
      outcomesData = outcomes.map((outcome) => {
        const outcomeName = typeof outcome === 'string' ? outcome : outcome.name || outcome.title || JSON.stringify(outcome)
        return {
          name: outcomeName,
          chance: 50,
          price: 0.5,
          yesPrice: 0.5,
          noPrice: 0.5,
          volume: 0
        }
      })
    }
  }

  const primaryMarket = markets.length > 0 ? markets[0] : null
  const volume = event.volume || event.volumeClob || event.volumeUsd || event.totalVolume || primaryMarket?.volumeNum || 0
  const liquidity = event.liquidity || event.liquidityClob || event.liquidityUsd || event.totalLiquidity || primaryMarket?.liquidityNum || 0
  const endDate = event.endDate || event.endDate_iso || event.endDateISO || event.closesAt || primaryMarket?.endDate
  const title = event.question || event.title || 'No title'
  const description = event.description || primaryMarket?.description || ''
  const image = event.image || event.icon || primaryMarket?.image || primaryMarket?.icon

  const rulesText = description.length > 300 && !showMoreRules 
    ? description.substring(0, 300) + '...' 
    : description

  return (
    <div className={`event-detail-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`event-detail-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="event-detail-header">
          <button className="modal-close-button" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="event-detail-content">
        <div className="event-header-section">
          <div className="event-header-left">
            {image && (
              <img src={image} alt={title} className="event-icon-large" />
            )}
            <div className="event-header-text">
              <h1 className="event-detail-title">
                {title}
              </h1>
              <div className="event-stats-header">
                {volume > 0 && (
                  <span className="stat-volume-header">${parseFloat(volume).toLocaleString()} Vol.</span>
                )}
                {liquidity > 0 && (
                  <span className="stat-liquidity-header">${parseFloat(liquidity).toLocaleString()} Liq.</span>
                )}
                {endDate && (
                  <span className="stat-date-header">
                    {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {outcomesData.length > 0 && (
          <div className={`event-outcomes-modal-list ${showAllOutcomes ? 'expanded' : ''}`}>
            {outcomesData.map((outcome, index) => {
              const yesPercent = outcome.chance || 0
              const noPercent = 100 - yesPercent
              const yesPercentDisplay = yesPercent < 1 ? '<1%' : `${Math.round(yesPercent)}%`
              const noPercentDisplay = noPercent < 1 ? '<1%' : `${Math.round(noPercent)}%`
              
              return (
              <div 
                key={index} 
                className={`event-outcome-modal-row ${index >= 3 ? 'expandable' : ''}`}
              >
                <div className="outcome-name-left-modal">
                  {outcome.name}
                </div>
                  <div className="outcome-binary-bar-container">
                    <div className="outcome-binary-bar-labels">
                      <span className="outcome-binary-label-yes">Yes {yesPercentDisplay}</span>
                      <span className="outcome-binary-label-no">No {noPercentDisplay}</span>
                    </div>
                    <div className="outcome-binary-bar">
                      <div 
                        className="outcome-binary-bar-yes" 
                        style={{ width: `${yesPercent}%` }}
                      ></div>
                      <div 
                        className="outcome-binary-bar-no" 
                        style={{ width: `${noPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
            {outcomesData.length > 3 && (
              <div 
                className="see-more-link-modal" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowAllOutcomes(!showAllOutcomes); 
                }}
              >
                {showAllOutcomes ? 'See less' : 'See more'}
              </div>
            )}
          </div>
        )}

        {description && (
          <div className="event-rules-section">
            <div className="rules-header">
              <h3>Market Context</h3>
              <span className="rules-title">{title}</span>
            </div>
            <div className="rules-content">
              <h4>Rules</h4>
              <p className="rules-text">{rulesText}</p>
              {description.length > 300 && (
                <button 
                  className="show-more-button"
                  onClick={() => setShowMoreRules(!showMoreRules)}
                >
                  {showMoreRules ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        )}

        {event.slug && (
          <div className="event-link-section">
            <a 
              href={`https://polymarket.com/event/${event.slug || event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="event-detail-link"
            >
              <span>Open on Polymarket</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail


