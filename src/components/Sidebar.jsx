import React, { useState } from 'react'
import './Sidebar.css'

// Import SVG icons from assets
import SportsIcon from '../../assets/sport-16-regular.svg'
import CryptoIcon from '../../assets/crypto-chat-mobile-phone.svg'
import BasketballIcon from '../../assets/basketball-svgrepo-com.svg'
import MoviesIcon from '../../assets/movie (1).svg'
import EsportsIcon from '../../assets/outline-sports-esports.svg'
import ScienceIcon from '../../assets/science-molecule.svg'
import FolderIcon from '../../assets/folder.svg'

// Category SVG Icons
const CategoryIcon = ({ categoryId }) => {
  const iconSize = 20
  const iconStyle = { 
    width: iconSize, 
    height: iconSize, 
    filter: 'brightness(0) invert(1)',
    objectFit: 'contain'
  }
  
  // Use imported SVG files where available, fallback to inline SVGs for missing ones
  const icons = {
    sports: <img src={SportsIcon} alt="Sports" style={iconStyle} />,
    crypto: <img src={CryptoIcon} alt="Crypto" style={iconStyle} />,
    basketball: <img src={BasketballIcon} alt="Basketball" style={iconStyle} />,
    movies: <img src={MoviesIcon} alt="Movies" style={iconStyle} />,
    esports: <img src={EsportsIcon} alt="Esports" style={iconStyle} />,
    science: <img src={ScienceIcon} alt="Science" style={iconStyle} />,
    // Fallback inline SVGs for categories without asset files
    politics: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="14" rx="2" ry="2"></rect>
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="12" y1="12" x2="12" y2="12"></line>
      </svg>
    ),
    technology: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    ),
    weather: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        <path d="M12 8v4l2 2"></path>
      </svg>
    ),
    music: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
    )
  }
  
  return icons[categoryId] || null
}

function Sidebar({ categories, onCategoryClick, activeCategory, searchTerm, setSearchTerm, onSearch, loading, aiSuggesting, myMarkets, onTogglePin, onRemoveMarket, onLoadMarket, onClearAllMarkets, onOpenHomePage, isCollapsed, onToggleCollapse }) {
  const [viewMode, setViewMode] = useState('categories')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(e)
    }
  }

  return (
    <>
      <button 
        className={`sidebar-toggle-button ${isCollapsed ? 'collapsed' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleCollapse) {
            onToggleCollapse();
          }
        }}
        aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
        type="button"
      >
        <span className="triangle-icon"></span>
      </button>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
        <div className="sidebar-toggle">
          <button
            type="button"
            className={`toggle-button ${viewMode === 'categories' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewMode('categories');
            }}
          >
            <img src={FolderIcon} alt="Categories" style={{ width: '16px', height: '16px', filter: 'brightness(0) invert(1)', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
            Categories
          </button>
          <button
            type="button"
            className={`toggle-button ${viewMode === 'myMarkets' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewMode('myMarkets');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            My ({myMarkets?.length || 0})
          </button>
        </div>
      </div>
      <nav className="sidebar-nav">
        {viewMode === 'categories' ? (
          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id} className="category-item">
                <button
                  className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => onCategoryClick(category.id)}
                >
                  <span className="category-icon">
                    <CategoryIcon categoryId={category.id} />
                  </span>
                  <span className="category-name">{category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="my-markets-sidebar">
            {!myMarkets || myMarkets.length === 0 ? (
              <div className="sidebar-empty">
                <p>No saved markets</p>
                <span>Your search queries will be saved here</span>
              </div>
            ) : (
              <>
                {myMarkets.length > 0 && (
                  <div className="markets-header-sidebar">
                    <span className="markets-count">{myMarkets.length} queries</span>
                    <button
                      className="clear-all-small"
                      onClick={onClearAllMarkets}
                      title="Clear all"
                    >
                      🗑️
                    </button>
                  </div>
                )}
                {myMarkets.filter(m => m.pinned).length > 0 && (
                  <div className="markets-section">
                    <h4 className="section-title-small">📌 Pinned</h4>
                    {myMarkets.filter(m => m.pinned).map(market => (
                      <MarketItemSidebar
                        key={market.id}
                        market={market}
                        onRemove={onRemoveMarket}
                        onTogglePin={onTogglePin}
                        onLoad={onLoadMarket}
                      />
                    ))}
                  </div>
                )}
                {myMarkets.filter(m => !m.pinned).length > 0 && (
                  <div className="markets-section">
                    {myMarkets.filter(m => m.pinned).length > 0 && (
                      <h4 className="section-title-small">All</h4>
                    )}
                    {myMarkets.filter(m => !m.pinned).map(market => (
                      <MarketItemSidebar
                        key={market.id}
                        market={market}
                        onRemove={onRemoveMarket}
                        onTogglePin={onTogglePin}
                        onLoad={onLoadMarket}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>
    </aside>
    </>
  )
}

function MarketItemSidebar({ market, onRemove, onTogglePin, onLoad }) {
  const displayName = market.categoryName || market.query || 'No name'
  const displayIcon = market.queryType === 'category' ? (
    <img src={FolderIcon} alt="Category" style={{ width: '14px', height: '14px', filter: 'brightness(0) invert(1)' }} />
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  )

  return (
    <div className={`market-item-sidebar ${market.pinned ? 'pinned' : ''}`}>
      <button
        className="market-button-sidebar"
        onClick={() => onLoad(market)}
      >
        <span className="market-icon-sidebar">{displayIcon}</span>
        <span className="market-name-sidebar">{displayName}</span>
      </button>
      <div className="market-actions-sidebar">
        <button
          className="action-button-sidebar pin-button-sidebar"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(market.id)
          }}
          title={market.pinned ? 'Unpin' : 'Pin'}
        >
          {market.pinned ? '📌' : '📍'}
        </button>
        <button
          className="action-button-sidebar remove-button-sidebar"
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

export default Sidebar

