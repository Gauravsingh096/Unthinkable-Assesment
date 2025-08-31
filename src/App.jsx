import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_LANG = 'en-US'

const UNITS = ['kg','g','liters','ml','pack','packs','bottle','bottles','piece','pieces','dozen']
const ACTIONS = {
  ADD: 'add',
  REMOVE: 'remove',
  SEARCH: 'search',
  INVENTORY: 'inventory',
  CATEGORY: 'category'
}

function parseCommand(text, languageCode) {
  console.log('Parsing command:', text, 'Language:', languageCode)
  if (!text) return null
  const lower = text.trim().toLowerCase()

  // quantity like: 2, 2.5, two (basic mapping)
  const wordToNum = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 }
  const qtyWord = Object.keys(wordToNum).find(w => lower.includes(` ${w} `) || lower.startsWith(`${w} `))
  let quantityMatch = lower.match(/\b(\d+(?:\.\d+)?)\b/)
  let quantity = quantityMatch ? parseFloat(quantityMatch[1]) : (qtyWord ? wordToNum[qtyWord] : 1)

  const unit = UNITS.find(u => lower.includes(` ${u}`)) || null

  // detect action
  const isAdd = /(add|buy|put|need|want to buy)/.test(lower)
  const isRemove = /(remove|delete|drop|take.*off)/.test(lower)
  const isSearch = /(find|search|look for)/.test(lower)
  const isInventory = /(check|inventory|stock|available|have)/.test(lower)
  const isCategory = /(category|categories|show|list|what.*in)/.test(lower)

  let action = null
  if (isAdd) action = ACTIONS.ADD
  else if (isRemove) action = ACTIONS.REMOVE
  else if (isSearch) action = ACTIONS.SEARCH
  else if (isInventory) action = ACTIONS.INVENTORY
  else if (isCategory) action = ACTIONS.CATEGORY

  // item name heuristic: remove verbs, quantities, units, stopwords
  let cleaned = lower
    .replace(/^(add|buy|put|need|want to buy|remove|delete|drop|take|find|search|look for|check|inventory|stock|available|have|category|categories|show|list|what.*in)\b/g, '')
    .replace(/\b(please|to|my|the|a|an|some|of|for|from|list|is|are|in|the)\b/g, '')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
    .trim()

  if (unit) cleaned = cleaned.replace(unit, '').trim()
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  // if phrase contains 'under $X' or 'under X dollars' for search
  let maxPrice = null
  const priceMatch = lower.match(/under\s*\$?(\d+(?:\.\d+)?)/)
  if (priceMatch) maxPrice = parseFloat(priceMatch[1])

  const result = { action, item: cleaned, quantity, unit, maxPrice }
  if (!action) result.action = ACTIONS.ADD
  if (action === ACTIONS.SEARCH) result.query = cleaned; result.maxPrice = maxPrice

  // Removal-specific shortcuts: "remove this/last", "remove item number X"
  if (action === ACTIONS.REMOVE) {
    const numberWordToIndex = { first:0, second:1, third:2, fourth:3, fifth:4 }
    const numberWord = Object.keys(numberWordToIndex).find(w => lower.includes(` ${w} `) || lower.endsWith(` ${w}`))
    const numMatch = lower.match(/item\s*(?:number\s*)?(\d+)/)
    if (numMatch) {
      const n = parseInt(numMatch[1], 10)
      if (!isNaN(n) && n > 0) result.removeIndex = n - 1
    } else if (numberWord) {
      result.removeIndex = numberWordToIndex[numberWord]
    } else if (/remove\s+(this|that|last)/.test(lower) || /take\s+.*(off|out)/.test(lower)) {
      result.removeLast = true
    }
  }
  
  console.log('Parsed result:', result)
  return result
}

function loadList() {
  try { return JSON.parse(localStorage.getItem('shopping:list') || '[]') } catch { return [] }
}
function saveList(items) { localStorage.setItem('shopping:list', JSON.stringify(items)) }

function categorizeItem(name) {
  const n = name.toLowerCase()
  if (/milk|cheese|yogurt|butter/.test(n)) return 'dairy'
  if (/apple|banana|orange|lettuce|spinach|tomato|onion|potato/.test(n)) return 'produce'
  if (/bread|rice|pasta|cereal/.test(n)) return 'grains'
  if (/chicken|beef|pork|fish|egg/.test(n)) return 'protein'
  if (/water|juice|soda|coffee|tea/.test(n)) return 'beverages'
  return 'other'
}

function suggestionsFromHistory(history) {
  const now = Date.now()
  return history
    .filter(h => now - (h.lastAddedAt || 0) > 1000*60*60*24*7) // not added in last 7 days
    .sort((a,b) => (b.addCount||0) - (a.addCount||0))
    .slice(0,5)
}

function App() {
  console.log('App component rendering...')
  
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANG)
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [items, setItems] = useState(() => loadList())
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('shopping:history') || '[]'))
  const [loading, setLoading] = useState(false)
  const [inventory] = useState(() => [
    { id: 'inv-1', name: 'milk', category: 'dairy', available: true, price: 2.99, location: 'A1' },
    { id: 'inv-2', name: 'bread', category: 'grains', available: true, price: 1.49, location: 'B2' },
    { id: 'inv-3', name: 'apples', category: 'produce', available: true, price: 3.99, location: 'C3' },
    { id: 'inv-4', name: 'chicken', category: 'protein', available: true, price: 8.99, location: 'D4' },
    { id: 'inv-5', name: 'water', category: 'beverages', available: true, price: 0.99, location: 'E5' },
    { id: 'inv-6', name: 'cheese', category: 'dairy', available: false, price: 4.99, location: 'A2' },
    { id: 'inv-7', name: 'rice', category: 'grains', available: true, price: 5.99, location: 'B3' },
    { id: 'inv-8', name: 'bananas', category: 'produce', available: true, price: 2.49, location: 'C4' },
    { id: 'inv-9', name: 'eggs', category: 'protein', available: true, price: 3.49, location: 'D5' },
    { id: 'inv-10', name: 'coffee', category: 'beverages', available: false, price: 6.99, location: 'E6' }
  ])
  const [searchResults, setSearchResults] = useState([])
  const [showInventory, setShowInventory] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)

  useEffect(() => { 
    console.log('App mounted, items:', items)
    saveList(items) 
  }, [items])
  
  useEffect(() => { 
    console.log('History updated:', history)
    localStorage.setItem('shopping:history', JSON.stringify(history)) 
  }, [history])

  const suggested = useMemo(() => suggestionsFromHistory(history), [history])

  async function startRecording() {
    console.log('Start recording clicked!')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted')
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      // Use a lower audioBitsPerSecond to reduce payload size and speed up upload
      const mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
      chunksRef.current = []

      // Setup simple VAD (voice activity detection) to auto-stop on silence
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        audioContextRef.current = audioCtx
        analyserRef.current = analyser

        const data = new Uint8Array(analyser.frequencyBinCount)
        let silentMs = 0
        const intervalMs = 200
        const silenceThreshold = 0.015 // lower is more sensitive
        silenceTimerRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(data)
          // Compute normalized RMS around 0.5
          let sumSquares = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sumSquares += v * v
          }
          const rms = Math.sqrt(sumSquares / data.length)
          if (rms < silenceThreshold) {
            silentMs += intervalMs
          } else {
            silentMs = 0
          }
          if (silentMs >= 1200 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Auto-stopping on silence')
            stopRecording()
          }
        }, intervalMs)
      } catch {}
      
      mr.ondataavailable = e => { 
        console.log('Audio data available:', e.data.size, 'bytes')
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data) 
      }
      
      mr.onstop = async () => {
        console.log('Recording stopped, processing audio...')
        const blob = new Blob(chunksRef.current, { type: mime })
        await transcribeBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        if (silenceTimerRef.current) { clearInterval(silenceTimerRef.current); silenceTimerRef.current = null }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
      }
      
      mr.onerror = (event) => {
        console.error('MediaRecorder error:', event.error)
        setTranscript('Recording error. Please try again.')
        setIsRecording(false)
        stream.getTracks().forEach(t => t.stop())
        if (silenceTimerRef.current) { clearInterval(silenceTimerRef.current); silenceTimerRef.current = null }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
      }
      
      mediaRecorderRef.current = mr
      mr.start()
      setIsRecording(true)
      setTranscript('Recording... Speak now!')
      console.log('Recording started successfully')
    } catch (error) {
      console.error('Media access error:', error)
      if (error.name === 'NotAllowedError') {
        setTranscript('Microphone access denied. Please allow microphone access and try again.')
      } else {
        setTranscript(`Microphone error: ${error.message}`)
      }
      setIsRecording(false)
    }
  }

  function stopRecording() {
    console.log('Stop recording clicked!')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('Recording stopped')
    }
  }

  async function transcribeBlob(blob) {
    console.log('Starting transcription...')
    setLoading(true)
    try {
      // Convert blob to base64 efficiently
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result || ''
          resolve(String(result).split(',')[1] || '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      
      console.log('Sending audio for transcription...')
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, languageCode })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      
      const data = await res.json()
      const text = data.text || ''
      console.log('Transcription received:', text)
      
      if (text) {
        setTranscript(text)
        const parsed = parseCommand(text, languageCode)
        if (parsed) {
          console.log('Command parsed, handling...')
          handleParsed(parsed)
        }
      } else {
        setTranscript('No text detected. Please try speaking more clearly.')
      }
    } catch (e) {
      console.error('Transcription error:', e)
      setTranscript(`Error: ${e.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  function handleParsed(parsed) {
    console.log('Handling parsed command:', parsed)
    if (!parsed) return
    if (parsed.action === ACTIONS.SEARCH) {
      // For demo, just show the search query in transcript area
      setTranscript(prev => `${prev}  [search: ${parsed.query}${parsed.maxPrice?` under $${parsed.maxPrice}`:''}]`)
      // Search inventory for the query
      const results = searchInventory(parsed.query, parsed.maxPrice)
      setSearchResults(results)
      setShowInventory(true)
      setShowCategories(false)
      return
    }
    if (parsed.action === ACTIONS.INVENTORY) {
      console.log('Checking inventory for:', parsed.item)
      const results = searchInventory(parsed.item)
      setSearchResults(results)
      setShowInventory(true)
      setShowCategories(false)
      if (results.length > 0) {
        const available = results.filter(r => r.available)
        const unavailable = results.filter(r => !r.available)
        let response = ''
        if (available.length > 0) {
          response += `Available: ${available.map(r => r.name).join(', ')}. `
        }
        if (unavailable.length > 0) {
          response += `Out of stock: ${unavailable.map(r => r.name).join(', ')}. `
        }
        setTranscript(prev => prev ? `${prev}  [${response}]` : response)
      } else {
        setTranscript(prev => prev ? `${prev}  [Item not found in inventory]` : 'Item not found in inventory')
      }
      return
    }
    if (parsed.action === ACTIONS.CATEGORY) {
      console.log('Showing category items for:', parsed.item)
      const categoryItems = getCategoryItems(parsed.item)
      setSearchResults(categoryItems)
      setShowInventory(true)
      setShowCategories(true)
      if (categoryItems.length > 0) {
        setTranscript(prev => prev ? `${prev}  [Found ${categoryItems.length} items in ${parsed.item} category]` : `Found ${categoryItems.length} items in ${parsed.item} category`)
      } else {
        setTranscript(prev => prev ? `${prev}  [No items found in that category]` : 'No items found in that category')
      }
      return
    }
    if (!parsed.item) return
    if (parsed.action === ACTIONS.ADD) {
      const newItem = {
        id: `${parsed.item}-${Date.now()}`,
        name: parsed.item,
        quantity: parsed.quantity || 1,
        unit: parsed.unit || null,
        category: categorizeItem(parsed.item)
      }
      console.log('Adding new item:', newItem)
      setItems(prev => [newItem, ...prev])
      setHistory(prev => {
        const idx = prev.findIndex(p => p.name === parsed.item)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = { ...copy[idx], addCount: (copy[idx].addCount||0)+1, lastAddedAt: Date.now() }
          return copy
        }
        return [{ name: parsed.item, addCount: 1, lastAddedAt: Date.now() }, ...prev]
      })
      return
    }
    if (parsed.action === ACTIONS.REMOVE) {
      console.log('Removing item (voice):', parsed.item)
      // Index-based removal if requested
      if (Number.isInteger(parsed.removeIndex) && parsed.removeIndex >= 0) {
        if (parsed.removeIndex < items.length) {
          const target = items[parsed.removeIndex]
          setItems(prev => prev.filter((_, idx) => idx !== parsed.removeIndex))
          setTranscript(prev => prev ? `${prev}  [removed: ${target.name}]` : `Removed: ${target.name}`)
        } else {
          setTranscript(prev => prev ? `${prev}  [no item at that number]` : 'No item at that number')
        }
        return
      }
      // Remove last if asked
      if (parsed.removeLast) {
        if (items.length > 0) {
          const target = items[0] // newest at top
          setItems(prev => prev.slice(1))
          setTranscript(prev => prev ? `${prev}  [removed: ${target.name}]` : `Removed: ${target.name}`)
        } else {
          setTranscript(prev => prev ? `${prev}  [list is empty]` : 'List is empty')
        }
        return
      }
      // Name/partial-based removal
      const toRemove = findBestRemovalMatch(items, parsed.item)
      if (toRemove) {
        setItems(prev => prev.filter(i => i.id !== toRemove.id))
        setTranscript(prev => prev ? `${prev}  [removed: ${toRemove.name}]` : `Removed: ${toRemove.name}`)
      } else {
        setTranscript(prev => prev ? `${prev}  [no match to remove]` : 'No matching item to remove')
      }
      return
    }
  }

  function removeItem(id) { 
    console.log('Removing item by ID:', id)
    setItems(prev => prev.filter(i => i.id !== id)) 
  }

  function searchInventory(query, maxPrice) {
    if (!query) return []
    const normalizedQuery = normalizeName(query)
    return inventory.filter(item => {
      const matchesName = normalizeName(item.name).includes(normalizedQuery) || 
                          normalizedQuery.includes(normalizeName(item.name))
      const matchesPrice = !maxPrice || item.price <= maxPrice
      return matchesName && matchesPrice
    }).sort((a, b) => {
      // Sort by availability first, then by name
      if (a.available !== b.available) return b.available ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }

  function getCategoryItems(category) {
    if (!category) return []
    const normalizedCategory = normalizeName(category)
    return inventory.filter(item => 
      normalizeName(item.category) === normalizedCategory
    ).sort((a, b) => a.name.localeCompare(b.name))
  }

  function normalizeName(s) {
    return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
  }

  function similarityScore(a, b) {
    // Simple token overlap score
    const ta = new Set(normalizeName(a).split(' '))
    const tb = new Set(normalizeName(b).split(' '))
    if (!ta.size || !tb.size) return 0
    let inter = 0
    ta.forEach(t => { if (tb.has(t)) inter++ })
    return inter / Math.max(ta.size, tb.size)
  }

  function findBestRemovalMatch(list, spoken) {
    if (!spoken) return null
    const spokenNorm = normalizeName(spoken)
    // Exact by normalized name
    let exact = list.find(i => normalizeName(i.name) === spokenNorm)
    if (exact) return exact
    // Starts with or includes
    let partial = list.find(i => normalizeName(i.name).startsWith(spokenNorm) || normalizeName(i.name).includes(spokenNorm))
    if (partial) return partial
    // Best similarity score above threshold
    let best = null
    let bestScore = 0
    for (const it of list) {
      const s = similarityScore(it.name, spoken)
      if (s > bestScore) { best = it; bestScore = s }
    }
    return bestScore >= 0.5 ? best : null
  }

  console.log('Current state - items:', items, 'transcript:', transcript, 'isRecording:', isRecording)

  return (
    <div className="app">
      <div className="header">
        <div className="title">Voice Shopping Assistant</div>
        <div className="header-controls">
          <div className="indicator">
            <span className={`dot ${isRecording ? 'recording' : ''}`}></span>
            {isRecording ? 'Recording...' : 'Idle'}
          </div>
          <div className="quick-actions">
            <button 
              className={`btn btn-secondary ${showInventory && !showCategories ? 'active' : ''}`} 
              onClick={() => { setShowInventory(!showInventory); setShowCategories(false) }}
              title="View and search inventory items"
            >
              <span className="btn-icon">📦</span>
              <span className="btn-text">Inventory</span>
              <span className="btn-subtitle">Check Stock</span>
            </button>
            <button 
              className={`btn btn-secondary ${showCategories ? 'active' : ''}`} 
              onClick={() => { setShowCategories(!showCategories); setShowInventory(false) }}
              title="Browse items by category"
            >
              <span className="btn-icon">📂</span>
              <span className="btn-text">Categories</span>
              <span className="btn-subtitle">Browse Items</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card row">
        <select className="select" value={languageCode} onChange={e => setLanguageCode(e.target.value)}>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Spanish (ES)</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="hi-IN">Hindi</option>
        </select>
        {!isRecording ? (
          <button className="btn btn-primary" onClick={startRecording} disabled={loading}>🎤 Start</button>
        ) : (
          <button className="btn btn-danger" onClick={stopRecording}>⏹️ Stop</button>
        )}
        {loading && <div className="spinner" />}
      </div>

      {showInventory && (
        <div className="card">
          <div className="section-title">
            {showCategories ? 'Category Items' : 'Inventory Search Results'}
            <button className="close-btn" onClick={() => { setShowInventory(false); setShowCategories(false) }}>✕</button>
          </div>
          <div className="inventory-grid">
            {searchResults.map(item => (
              <div key={item.id} className={`inventory-item ${!item.available ? 'unavailable' : ''}`}>
                <div className="item-header">
                  <span className="item-name">{item.name}</span>
                  <span className={`status ${item.available ? 'available' : 'unavailable'}`}>
                    {item.available ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="item-details">
                  <span className="category-tag" data-category={item.category}>{item.category}</span>
                  <span className="price">{item.price}</span>
                  <span className="location">{item.location}</span>
                </div>
              </div>
            ))}
            {searchResults.length === 0 && (
              <div className="no-results">No items found</div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Transcript</div>
        <div className="transcript">{transcript}</div>
      </div>

      <div className="card">
        <div className="section-title">Suggestions</div>
        <div className="suggestions">
          {suggested.map(s => (
            <button className="suggestion-btn" key={s.name} onClick={() => handleParsed({ action: ACTIONS.ADD, item: s.name, quantity: 1 })}>
              + {s.name}
            </button>
          ))}
          {suggested.length === 0 && <span style={{ color: '#8a90a7' }}>None yet</span>}
        </div>
      </div>

      <div className="card">
        <span className="list-title"><strong>Shopping List ({items.length} items)</strong></span>
        <ul className="list">
          {items.map(it => (
            <li key={it.id} className="item-row">
              <span className="item-name">
                <span>{it.name}</span>
                <span className="item-meta">
                  {it.quantity ? `× ${it.quantity}` : ''} {it.unit || ''} 
                  <span className="category-badge">{it.category}</span>
                </span>
              </span>
              <button className="item-remove" onClick={() => removeItem(it.id)}>Remove</button>
            </li>
          ))}
          {items.length === 0 && <li className="item-row" style={{ borderBottom: 'none' }}>No items yet. Try saying "Add 2 bottles of water".</li>}
        </ul>
      </div>

      <div className="card">
        <div className="section-title">Voice Commands</div>
        <div className="commands-grid">
          <div className="command-group">
            <h4>Add Items</h4>
            <p>"Add 2 bottles of water"</p>
            <p>"Buy 1 kg apples"</p>
          </div>
          <div className="command-group">
            <h4>Remove Items</h4>
            <p>"Remove milk"</p>
            <p>"Delete last item"</p>
            <p>"Remove item number 2"</p>
          </div>
          <div className="command-group">
            <h4>Search & Inventory</h4>
            <p>"Check if milk is available"</p>
            <p>"Search for bread under $5"</p>
            <p>"Show dairy category"</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
