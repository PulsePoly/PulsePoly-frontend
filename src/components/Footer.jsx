import { useState, useEffect, useRef } from 'react'
import './Footer.css'
import PulseLogo from '../../assets/pulse.png'
import PumpLogo from '../../assets/pump.png'

function Footer({ currentView, loading, loadingMore, eventDetailLoading, selectedEvent }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const footerRef = useRef(null)
  const previousViewRef = useRef(currentView)
  const previousSelectedEventRef = useRef(selectedEvent)

  // Collapse footer when view changes
  useEffect(() => {
    if (previousViewRef.current !== currentView) {
      setIsExpanded(false)
      previousViewRef.current = currentView
    }
  }, [currentView])

  // Collapse footer when event detail opens/closes
  useEffect(() => {
    const hadEvent = previousSelectedEventRef.current !== null
    const hasEvent = selectedEvent !== null
    
    if (hadEvent !== hasEvent) {
      setIsExpanded(false)
      previousSelectedEventRef.current = selectedEvent
    }
  }, [selectedEvent])

  // Check if any loading state is active
  const isLoading = loading || loadingMore || eventDetailLoading

  useEffect(() => {
    const checkScrollPosition = () => {
      // Don't expand if loading
      if (isLoading) {
        setIsExpanded(false)
        return
      }

      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollBottom = scrollTop + windowHeight

      // Check if user has scrolled to the very end (within 30px threshold for fixed footer)
      // Increased threshold to work better with pagination and infinite scroll
      const isAtBottom = scrollBottom >= documentHeight - 30

      setIsExpanded(isAtBottom)
    }

    // Check on mount
    checkScrollPosition()

    // Add scroll event listener with throttling for better performance
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScrollPosition()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', checkScrollPosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkScrollPosition)
    }
  }, [isLoading])

  return (
    <footer ref={footerRef} className={`footer ${isExpanded ? 'expanded' : ''}`}>
      <div className="footer-container">
        <div className={`footer-content ${isExpanded ? 'expanded' : ''}`}>
          <div className="footer-section">
            <div className="footer-logo">
              <img src={PulseLogo} alt="Pulse" className="footer-logo-image" />
              <h3>
                <span className="footer-logo-pulse">Pulse</span>
                <span className="footer-logo-poly">Poly</span>
              </h3>
            </div>
            <p>Search events on the largest prediction market</p>
          </div>
          
          <div className="footer-section">
            <h4>Useful Links</h4>
            <ul>
              <li>
                <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">
                  Polymarket
                </a>
              </li>
              <li>
                <a href="https://docs.polymarket.com" target="_blank" rel="noopener noreferrer">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="https://polymarket.com/search" target="_blank" rel="noopener noreferrer">
                  Official Search
                </a>
              </li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="footer-social-icons">
              <a href="https://github.com/PulsePoly/PulsePoly-frontend" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://pump.fun/coin/cmARqNsfek2YtSofp87ZRivDBrJvxLY8Rao59Akpump" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Pumpfun">
                <img src={PumpLogo} alt="Pumpfun" className="footer-social-icon-image" />
              </a>
              <a href="https://x.com/PulsePoly" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="X (Twitter)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className={`footer-bottom ${isExpanded ? 'expanded' : ''}`}>
          <p>© 2025 PulsePoly. Uses Polymarket public API.</p>
          <p className={`footer-disclaimer ${isExpanded ? 'visible' : ''}`}>
            This site is not affiliated with Polymarket. For searching and viewing events only.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer


