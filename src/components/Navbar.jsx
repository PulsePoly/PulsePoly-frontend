import { useState, useEffect } from 'react'
import './Navbar.css'
import PulseLogo from '../../assets/pulse.png'
import PumpLogo from '../../assets/pump.png'

function Navbar({ onLogoClick }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Example random CA address (Solana format)
  const exampleCA = 'cmARqNsfek2YtSofp87ZRivDBrJvxLY8Rao59Akpump'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 70)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCopyCA = async (e) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(exampleCA)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <nav className={`navbar ${isScrolled ? 'shrink' : ''}`}>
      <div className="navbar-buttons-container">
        <div className="navbar-logo" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
          <img src={PulseLogo} alt="Pulse" className="navbar-logo-image" />
          <div className="navbar-logo-text">
            <h1 className="logo">PulsePoly</h1>
          </div>
        </div>
        <div className="navbar-nav-links">
          <a href="#" onClick={(e) => { e.preventDefault(); onLogoClick(); }} className="navbar-nav-link">
            Home
          </a>
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="navbar-nav-link">
            Polymarket
          </a>
          <a href="https://docs.polymarket.com" target="_blank" rel="noopener noreferrer" className="navbar-nav-link">
            Docs
          </a>
        </div>
        <div className="navbar-social-icons">
          <div 
            className={`navbar-ca ${isScrolled ? 'collapsed' : ''} ${copied ? 'copied' : ''}`}
            onClick={handleCopyCA}
            style={{ cursor: 'pointer' }}
            title="Click to copy"
          >
            <span className="navbar-ca-label">CA:</span>
            <span className={`navbar-ca-address ${isScrolled ? 'hidden' : ''}`}>{exampleCA.slice(0, 4)}...{exampleCA.slice(-4)}</span>
            {copied && <span className="navbar-ca-copied">Copied!</span>}
          </div>
          <a href="https://github.com/PulsePoly/PulsePoly-frontend" target="_blank" rel="noopener noreferrer" className="navbar-social-icon" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="https://pump.fun/coin/cmARqNsfek2YtSofp87ZRivDBrJvxLY8Rao59Akpump" target="_blank" rel="noopener noreferrer" className="navbar-social-icon" aria-label="Pumpfun">
            <img src={PumpLogo} alt="Pumpfun" className="navbar-social-icon-image" />
          </a>
          <a href="https://x.com/PulsePoly" target="_blank" rel="noopener noreferrer" className="navbar-social-icon" aria-label="X (Twitter)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

