import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import './Chat.css'

const Chat = forwardRef((props, ref) => {
  const { onFetchEventById } = props
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  // Check if this is first visit and show welcome message
  useEffect(() => {
    const hasVisited = localStorage.getItem('chat_has_visited')
    if (!hasVisited && isOpen) {
      setHasShownWelcome(true)
      setMessages([{
        text: 'Hello! Click the AI button on any event card to analyze it, or type an event ID to analyze. You can also ask me anything about prediction markets.',
        sender: 'ai'
      }])
      localStorage.setItem('chat_has_visited', 'true')
    }
  }, [isOpen])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendMessage: (messageText, displayText) => {
      if (messageText) {
        handleSendMessage(messageText, displayText)
      }
    },
    openChat: () => {
      setIsOpen(true)
    }
  }))

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSendMessage = async (messageText, displayText = null) => {
    if (!messageText.trim()) return

    // Add user message - use displayText if provided (for showing just ID), otherwise use messageText
    const userMessage = { 
      text: displayText || messageText, 
      sender: 'user',
      actualPrompt: messageText // Store the actual prompt sent to AI
    }
    setMessages(prev => [...prev, userMessage])
    
    // Open chat if closed
    if (!isOpen) {
      setIsOpen(true)
    }

    // Get AI response
    setIsLoading(true)
    try {
      const aiResponse = await getAIResponse(messageText)
      setMessages(prev => [...prev, { text: aiResponse, sender: 'ai' }])
    } catch (error) {
      const errorMessage = error.message || 'Sorry, I encountered an error. Please try again.'
      setMessages(prev => [...prev, { 
        text: `Error: ${errorMessage}`, 
        sender: 'ai' 
      }])
      console.error('Chat error details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      const messageText = inputValue.trim()
      setInputValue('')
      
      // Check if message looks like an ID (mostly alphanumeric, possibly with dashes)
      const looksLikeId = /^[a-zA-Z0-9\-_]+$/.test(messageText) && messageText.length > 0
      
      if (looksLikeId && onFetchEventById) {
        // Try to fetch event by ID
        try {
          const eventResult = await onFetchEventById(messageText)
          if (eventResult) {
            // Event found - send formatted prompt, display just the ID
            await handleSendMessage(eventResult.prompt, eventResult.displayText)
          } else {
            // Not an event ID or event not found - send as regular message
            await handleSendMessage(messageText)
          }
        } catch (error) {
          // Error fetching event - send as regular message
          await handleSendMessage(messageText)
        }
      } else {
        // Regular message - send directly
        await handleSendMessage(messageText)
      }
    }
  }

  const getAIResponse = async (userMessage) => {
    const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
    const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
    
    if (!OPENROUTER_API_KEY) {
      return 'AI features are not configured. Please set VITE_OPENROUTER_API_KEY in your .env file and restart the dev server. This same API key is used for all AI features in the app (search suggestions and chat).'
    }

    // System prompt without betting recommendations
    const systemPrompt = 'You are an expert analyst for prediction markets. ALWAYS respond in this exact structure:\n\n📊 Prediction: [Clear statement about what the market predicts will happen]\n⭐ Favored Outcome: [EXACT outcome name with HIGHEST probability] at [exact %] | 💰 Volume: $[exact amount]\n🔮 Outlook: [Brief analysis of market confidence and why this outcome is favored]\n\nCRITICAL RULES:\n- Clearly tell the user which outcome is FAVORED (highest probability)\n- Use the EXACT outcome name from the data\n- Use the EXACT percentage shown\n- Use the EXACT volume number\n- Explain WHY this outcome is favored\n- Be extremely concise but clear'

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PulsePoly - Prediction Market Analytics'
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 120
        })
      })
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.error?.message) {
            errorMessage = errorData.error.message
          } else if (errorData.error) {
            errorMessage = JSON.stringify(errorData.error)
          }
        } catch (e) {
          // If we can't parse the error, use status text
          errorMessage = `API error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from AI service')
      }
      
      const aiText = data.choices[0].message.content?.trim() || 'I apologize, but I couldn\'t generate a response. Please try again.'
      
      return aiText
    } catch (error) {
      console.error('AI request error:', error)
      // Return a more helpful error message
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Invalid API key. Please check your VITE_OPENROUTER_API_KEY in .env file.')
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error. Please check your browser console for more details.')
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection.')
      }
      throw error
    }
  }

  // Format message - preserve line breaks and structure labels only
  const formatMessageWithNumbers = (text) => {
    if (!text) return ''
    
    // First, preserve line breaks
    text = text.replace(/\n/g, '<br/>')
    
    // Format structured sections with emojis and labels only
    text = text.replace(/(📊 Prediction:|⭐ Favored Outcome:|⭐ Favored:|🔮 Outlook:)/g, '<strong class="chat-structure-label">$1</strong>')
    text = text.replace(/(Prediction:|Stats:|Favored Outcome:|Favored:|Outlook:)/g, '<strong class="chat-structure-label">$1</strong>')
    
    // No number highlighting - just return the text as is
    return text
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const messagesContainer = document.querySelector('.chat-messages')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <>
      <button 
        className={`chat-toggle-button ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <div className="chat-header-text">
                <h3 className="chat-title">PulsePoly AI</h3>
                <p className="chat-subtitle">Ask me anything about markets</p>
              </div>
            </div>
            <div className="chat-header-actions">
              <button 
                className="chat-close-button"
                onClick={handleToggle}
                aria-label="Close Chat"
              >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <p className="chat-empty-text">Start a conversation with AI</p>
                <p className="chat-empty-hint">Ask questions about markets, events, or get predictions</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div key={index} className={`chat-message ${message.sender === 'user' ? 'user' : ''}`}>
                    <div className="chat-message-content">
                      {message.sender === 'ai' ? (
                        <span dangerouslySetInnerHTML={{ __html: formatMessageWithNumbers(message.text) }} />
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-message">
                    <div className="chat-message-content">
                      <div className="chat-loading">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button 
              type="submit"
              className="chat-send-button"
              disabled={!inputValue.trim() || isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
})

Chat.displayName = 'Chat'

export default Chat

