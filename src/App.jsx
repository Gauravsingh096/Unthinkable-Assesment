import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_LANG = 'en-US'

const UNITS = ['kg','g','liters','ml','pack','packs','bottle','bottles','piece','pieces','dozen']

// Hindi language support
const HINDI_UNITS = ['किलो', 'ग्राम', 'लीटर', 'मिलीलीटर', 'पैक', 'पैकेट', 'बोतल', 'टुकड़ा', 'दर्जन']
const HINDI_ACTIONS = {
  ADD: ['जोड़ो', 'खरीदो', 'रखो', 'चाहिए', 'लाओ', 'दो'],
  REMOVE: ['हटाओ', 'मिटाओ', 'निकालो', 'हटा दो', 'डिलीट करो'],
  SEARCH: ['ढूंढो', 'खोजो', 'दिखाओ', 'क्या है'],
  INVENTORY: ['स्टॉक', 'उपलब्ध', 'क्या मिलेगा', 'चेक करो'],
  CATEGORY: ['श्रेणी', 'कैटेगरी', 'दिखाओ', 'क्या है']
}

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

  // Hindi number mapping
  const hindiToNum = { 
    एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, 
    छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
    आधा: 0.5, सवा: 1.25, डेढ़: 1.5, ढाई: 2.5
  }

  // quantity like: 2, 2.5, two (basic mapping) or Hindi numbers
  const wordToNum = { 
    one: 1, two: 2, three: 3, four: 4, five: 5, 
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    half: 0.5, quarter: 0.25
  }
  
  // Check for Hindi numbers first
  let quantityMatch = null
  let quantity = 1
  
  // Look for Hindi numbers
  const hindiNumWord = Object.keys(hindiToNum).find(w => 
    lower.includes(` ${w} `) || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`)
  )
  if (hindiNumWord) {
    quantity = hindiToNum[hindiNumWord]
  } else {
    // Look for English numbers
    const qtyWord = Object.keys(wordToNum).find(w => 
      lower.includes(` ${w} `) || lower.startsWith(`${w} `)
    )
    quantityMatch = lower.match(/\b(\d+(?:\.\d+)?)\b/)
    quantity = quantityMatch ? parseFloat(quantityMatch[1]) : (qtyWord ? wordToNum[qtyWord] : 1)
  }

  // Check for units in both languages
  let unit = null
  if (languageCode === 'hi-IN') {
    unit = HINDI_UNITS.find(u => lower.includes(` ${u}`)) || 
           UNITS.find(u => lower.includes(` ${u}`)) || null
  } else {
    unit = UNITS.find(u => lower.includes(` ${u}`)) || null
  }

  // detect action in both languages
  let isAdd = false
  let isRemove = false
  let isSearch = false
  let isInventory = false
  let isCategory = false

  if (languageCode === 'hi-IN') {
    // Hindi action detection
    isAdd = HINDI_ACTIONS.ADD.some(action => lower.includes(action))
    isRemove = HINDI_ACTIONS.REMOVE.some(action => lower.includes(action))
    isSearch = HINDI_ACTIONS.SEARCH.some(action => lower.includes(action))
    isInventory = HINDI_ACTIONS.INVENTORY.some(action => lower.includes(action))
    isCategory = HINDI_ACTIONS.CATEGORY.some(action => lower.includes(action))
    
    // Also check English actions for Hindi users who might mix languages
    if (!isAdd) isAdd = /(add|buy|put|need|want to buy)/.test(lower)
    if (!isRemove) isRemove = /(remove|delete|drop|take.*off)/.test(lower)
    if (!isSearch) isSearch = /(find|search|look for)/.test(lower)
    if (!isInventory) isInventory = /(check|inventory|stock|available|have)/.test(lower)
    if (!isCategory) isCategory = /(category|categories|show|list|what.*in)/.test(lower)
  } else {
    // English action detection
    isAdd = /(add|buy|put|need|want to buy)/.test(lower)
    isRemove = /(remove|delete|drop|take.*off)/.test(lower)
    isSearch = /(find|search|look for)/.test(lower)
    isInventory = /(check|inventory|stock|available|have)/.test(lower)
    isCategory = /(category|categories|show|list|what.*in)/.test(lower)
  }

  let action = null
  if (isAdd) action = ACTIONS.ADD
  else if (isRemove) action = ACTIONS.REMOVE
  else if (isSearch) action = ACTIONS.SEARCH
  else if (isInventory) action = ACTIONS.INVENTORY
  else if (isCategory) action = ACTIONS.CATEGORY

  // item name heuristic: remove verbs, quantities, units, stopwords in both languages
  let cleaned = lower
  
  // Remove Hindi action words
  if (languageCode === 'hi-IN') {
    HINDI_ACTIONS.ADD.forEach(word => cleaned = cleaned.replace(new RegExp(word, 'g'), ''))
    HINDI_ACTIONS.REMOVE.forEach(word => cleaned = cleaned.replace(new RegExp(word, 'g'), ''))
    HINDI_ACTIONS.SEARCH.forEach(word => cleaned = cleaned.replace(new RegExp(word, 'g'), ''))
    HINDI_ACTIONS.INVENTORY.forEach(word => cleaned = cleaned.replace(new RegExp(word, 'g'), ''))
    HINDI_ACTIONS.CATEGORY.forEach(word => cleaned = cleaned.replace(new RegExp(word, 'g'), ''))
  }
  
  // Remove English action words
  cleaned = cleaned
    .replace(/^(add|buy|put|need|want to buy|remove|delete|drop|take|find|search|look for|check|inventory|stock|available|have|category|categories|show|list|what.*in)\b/g, '')
    .replace(/\b(please|to|my|the|a|an|some|of|for|from|list|is|are|in|the)\b/g, '')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
    .trim()

  // Remove Hindi stopwords
  if (languageCode === 'hi-IN') {
    cleaned = cleaned
      .replace(/\b(में|का|की|के|है|हैं|में|से|पर|को|दो|एक|कुछ|थोड़ा|बहुत|सब|सारे)\b/g, '')
      .trim()
  }

  if (unit) cleaned = cleaned.replace(unit, '').trim()
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  // if phrase contains 'under $X' or 'under X dollars' for search
  let maxPrice = null
  const priceMatch = lower.match(/under\s*\$?(\d+(?:\.\d+)?)/)
  if (priceMatch) maxPrice = parseFloat(priceMatch[1])

  const result = { action, item: cleaned, quantity, unit, maxPrice }
  if (!action) result.action = ACTIONS.ADD
  if (action === ACTIONS.SEARCH) result.query = cleaned; result.maxPrice = maxPrice

  // Removal-specific shortcuts: "remove this/last", "remove item number X" (both languages)
  if (action === ACTIONS.REMOVE) {
    const numberWordToIndex = { 
      first: 0, second: 1, third: 2, fourth: 3, fifth: 4,
      पहला: 0, दूसरा: 1, तीसरा: 2, चौथा: 3, पांचवां: 4
    }
    const numberWord = Object.keys(numberWordToIndex).find(w => 
      lower.includes(` ${w} `) || lower.endsWith(` ${w}`)
    )
    const numMatch = lower.match(/item\s*(?:number\s*)?(\d+)/)
    if (numMatch) {
      const n = parseInt(numMatch[1], 10)
      if (!isNaN(n) && n > 0) result.removeIndex = n - 1
    } else if (numberWord) {
      result.removeIndex = numberWordToIndex[numberWord]
    } else if (/remove\s+(this|that|last)/.test(lower) || /take\s+.*(off|out)/.test(lower) ||
               /हटाओ\s+(यह|वह|आखिरी)/.test(lower) || /निकालो\s+.*(बाहर)/.test(lower)) {
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

function suggestionsFromHistory(history, currentItems) {
  const now = Date.now()
  
  // Get frequently used items from history (not in last 7 days)
  const frequentItems = history
    .filter(h => now - (h.lastAddedAt || 0) > 1000*60*60*24*7)
    .sort((a,b) => (b.addCount||0) - (a.addCount||0))
    .slice(0, 3)
  
  // Get recent items from current shopping list (last 5 items)
  const recentItems = currentItems
    .slice(0, 5)
    .map(item => ({
      name: item.name,
      type: 'recent',
      category: item.category
    }))
  
  // Get popular items from current list (items that appear multiple times)
  const popularInList = currentItems.reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + 1
    return acc
  }, {})
  
  const popularItems = Object.entries(popularInList)
    .filter(([name, count]) => count > 1)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([name]) => ({
      name,
      type: 'popular',
      category: currentItems.find(item => item.name === name)?.category
    }))
  
  // Combine all suggestions, removing duplicates
  const allSuggestions = [...recentItems, ...popularItems, ...frequentItems]
  const uniqueSuggestions = allSuggestions.reduce((acc, item) => {
    if (!acc.find(s => s.name === item.name)) {
      acc.push(item)
    }
    return acc
  }, [])
  
  return uniqueSuggestions.slice(0, 6) // Show max 6 suggestions
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
    { id: 'inv-10', name: 'coffee', category: 'beverages', available: false, price: 6.99, location: 'E6' },
    { id: 'inv-11', name: 'yogurt', category: 'dairy', available: true, price: 3.49, location: 'A3' },
    { id: 'inv-12', name: 'pasta', category: 'grains', available: true, price: 2.99, location: 'B4' },
    { id: 'inv-13', name: 'tomatoes', category: 'produce', available: true, price: 2.99, location: 'C5' },
    { id: 'inv-14', name: 'beef', category: 'protein', available: true, price: 12.99, location: 'D6' },
    { id: 'inv-15', name: 'orange juice', category: 'beverages', available: true, price: 4.49, location: 'E7' },
    { id: 'inv-16', name: 'chips', category: 'snacks', available: true, price: 3.99, location: 'F1' },
    { id: 'inv-17', name: 'cookies', category: 'snacks', available: true, price: 2.99, location: 'F2' },
    { id: 'inv-18', name: 'frozen pizza', category: 'frozen', available: true, price: 8.99, location: 'G1' },
    { id: 'inv-19', name: 'olive oil', category: 'pantry', available: true, price: 7.99, location: 'H1' },
    { id: 'inv-20', name: 'salt', category: 'pantry', available: true, price: 1.99, location: 'H2' }
  ])
  const [searchResults, setSearchResults] = useState([])
  const [showInventory, setShowInventory] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showCategoryHelp, setShowCategoryHelp] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const [filteredCategories, setFilteredCategories] = useState([])
  const [manualItemName, setManualItemName] = useState('')
  const [manualItemQuantity, setManualItemQuantity] = useState(1)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [showVoiceHelp, setShowVoiceHelp] = useState(false)

  // Enhanced category list with descriptions and examples
  const categoryList = [
    { 
      name: 'dairy', 
      icon: '🥛', 
      description: 'Milk, cheese, yogurt, butter',
      examples: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ice cream', 'paneer'],
      color: '#4A90E2'
    },
    { 
      name: 'produce', 
      icon: '🥬', 
      description: 'Fresh fruits, vegetables, herbs',
      examples: ['apples', 'bananas', 'tomatoes', 'lettuce', 'spinach', 'onions', 'potatoes'],
      color: '#7ED321'
    },
    { 
      name: 'grains', 
      icon: '🌾', 
      description: 'Bread, rice, pasta, cereals, flour',
      examples: ['bread', 'rice', 'pasta', 'cereal', 'flour', 'oats', 'quinoa'],
      color: '#F5A623'
    },
    { 
      name: 'protein', 
      icon: '🥩', 
      description: 'Meat, fish, eggs, beans, nuts',
      examples: ['chicken', 'beef', 'fish', 'eggs', 'beans', 'nuts', 'tofu'],
      color: '#D0021B'
    },
    { 
      name: 'beverages', 
      icon: '🥤', 
      description: 'Drinks, juices, coffee, tea, water',
      examples: ['water', 'juice', 'coffee', 'tea', 'soda', 'milk', 'smoothies'],
      color: '#9013FE'
    },
    { 
      name: 'snacks', 
      icon: '🍿', 
      description: 'Chips, cookies, candies, nuts',
      examples: ['chips', 'cookies', 'candy', 'popcorn', 'nuts', 'chocolate', 'crackers'],
      color: '#FF6B6B'
    },
    { 
      name: 'frozen', 
      icon: '🧊', 
      description: 'Frozen meals, ice cream, frozen vegetables',
      examples: ['frozen pizza', 'ice cream', 'frozen peas', 'frozen fish', 'frozen berries'],
      color: '#50E3C2'
    },
    { 
      name: 'pantry', 
      icon: '🥫', 
      description: 'Canned goods, spices, oils, condiments',
      examples: ['canned beans', 'olive oil', 'salt', 'pepper', 'ketchup', 'mustard', 'sauce'],
      color: '#8B572A'
    }
  ]

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

  const suggested = useMemo(() => suggestionsFromHistory(history, items), [history, items])

  // Consolidate duplicate items for better display
  const consolidatedItems = useMemo(() => {
    const consolidated = {}
    
    items.forEach(item => {
      const key = `${item.name}-${item.category}`
      if (consolidated[key]) {
        consolidated[key].quantity += item.quantity
        consolidated[key].count += 1
      } else {
        consolidated[key] = {
          ...item,
          count: 1
        }
      }
    })
    
    return Object.values(consolidated).sort((a, b) => b.count - a.count)
  }, [items])

  // Function to remove all instances of a consolidated item
  const removeConsolidatedItem = (itemName, category) => {
    setItems(prev => prev.filter(item => !(item.name === itemName && item.category === category)))
  }

  // Filter categories based on search query
  useEffect(() => {
    if (categorySearchQuery.trim() === '') {
      setFilteredCategories(categoryList)
    } else {
      const query = normalizeName(categorySearchQuery)
      const filtered = categoryList.filter(category => 
        normalizeName(category.name).includes(query) ||
        category.examples.some(example => normalizeName(example).includes(query)) ||
        normalizeName(category.description).includes(query)
      )
      setFilteredCategories(filtered)
    }
  }, [categorySearchQuery, categoryList])

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

  function findCategoryByName(name) {
    return categoryList.find(cat => 
      normalizeName(cat.name) === normalizeName(name) ||
      cat.examples.some(example => normalizeName(example).includes(normalizeName(name)))
  )
  }

  function handleCategoryClick(category) {
    setSelectedCategory(category.name)
    const items = getCategoryItems(category.name)
    setSearchResults(items)
    setShowInventory(true)
    setShowCategories(false)
    setShowCategoryHelp(false)
    
    if (items.length > 0) {
      setTranscript(`Found ${items.length} items in ${category.name} category: ${items.map(i => i.name).join(', ')}`)
    } else {
      setTranscript(`No items found in ${category.name} category. Try adding some items first!`)
    }
  }

  function showCategoryHelpDialog() {
    setShowCategoryHelp(true)
    setShowCategories(false)
  }

  function addItemToList(item) {
    const newItem = {
      id: `${item.name}-${Date.now()}`,
      name: item.name,
      quantity: 1,
      unit: null,
      category: item.category
    }
    
    setItems(prev => [newItem, ...prev])
    setHistory(prev => {
      const idx = prev.findIndex(p => p.name === item.name)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], addCount: (copy[idx].addCount||0)+1, lastAddedAt: Date.now() }
        return copy
      }
      return [{ name: item.name, addCount: 1, lastAddedAt: Date.now() }, ...prev]
    })
    
    setTranscript(prev => prev ? `${prev}  [Added ${item.name} to shopping list]` : `Added ${item.name} to shopping list`)
  }

  function addManualItem() {
    if (!manualItemName.trim()) return
    
    const newItem = {
      id: `${manualItemName.trim()}-${Date.now()}`,
      name: manualItemName.trim(),
      quantity: manualItemQuantity,
      unit: null,
      category: categorizeItem(manualItemName.trim())
    }
    
    setItems(prev => [newItem, ...prev])
    setHistory(prev => {
      const idx = prev.findIndex(p => p.name === manualItemName.trim())
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], addCount: (copy[idx].addCount||0)+1, lastAddedAt: Date.now() }
        return copy
      }
      return [{ name: manualItemName.trim(), addCount: 1, lastAddedAt: Date.now() }, ...prev]
    })
    
    setTranscript(prev => prev ? `${prev}  [Manually added: ${manualItemName.trim()}]` : `Manually added: ${manualItemName.trim()}`)
    setManualItemName('')
    setManualItemQuantity(1)
    setShowManualAdd(false)
  }

  function clearCategorySearch() {
    setCategorySearchQuery('')
    setFilteredCategories(categoryList)
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
          <div className="status-indicator">
            <span className={`dot ${isRecording ? 'recording' : ''}`}></span>
            {isRecording ? 'Recording...' : 'Idle'}
          </div>
          
          <button 
            className="header-btn" 
            onClick={() => setShowInventory(!showInventory)}
            title="Check item availability and stock"
          >
            <span className="btn-icon">📦</span>
            <div className="btn-content">
              <div className="btn-main">Inventory</div>
              <div className="btn-subtitle">Check Stock</div>
            </div>
          </button>
          
          <button 
            className="header-btn" 
            onClick={() => setShowCategories(!showCategories)}
            title="Browse items by category"
          >
            <span className="btn-icon">🏷️</span>
            <div className="btn-content">
              <div className="btn-main">Categories</div>
              <div className="btn-subtitle">Browse Items</div>
            </div>
          </button>

          <button 
            className="header-btn help-btn" 
            onClick={() => setShowVoiceHelp(true)}
            title="Voice commands help and examples"
          >
            <span className="btn-icon">❓</span>
            <div className="btn-content">
              <div className="btn-main">Help</div>
              <div className="btn-subtitle">Voice Commands</div>
            </div>
          </button>
        </div>
      </div>

      <div className="card row">
        <select className="select" value={languageCode} onChange={e => setLanguageCode(e.target.value)}>
          <option value="en-US">🇺🇸 English (US)</option>
          <option value="hi-IN">🇮🇳 हिंदी (Hindi)</option>
        </select>
        {!isRecording ? (
          <button className="btn btn-primary" onClick={startRecording} disabled={loading}>🎤 Start</button>
        ) : (
          <button className="btn btn-danger" onClick={stopRecording}>⏹️ Stop</button>
        )}
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowManualAdd(!showManualAdd)}
          title="Manually add items to shopping list"
        >
          ✏️ Manual Add
        </button>
        {loading && <div className="spinner" />}
      </div>

      {/* Manual Add Item Section */}
      {showManualAdd && (
        <div className="card">
          <div className="section-title">
            Manually Add Item
            <button className="close-btn" onClick={() => setShowManualAdd(false)}>✕</button>
          </div>
          <div className="manual-add-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  {languageCode === 'hi-IN' ? 'आइटम का नाम:' : 'Item Name:'}
                </label>
                <input
                  type="text"
                  value={manualItemName}
                  onChange={(e) => setManualItemName(e.target.value)}
                  placeholder={languageCode === 'hi-IN' ? 'जैसे: दूध, रोटी, सेब...' : 'e.g., milk, bread, apples...'}
                  className="form-input"
                  onKeyPress={(e) => e.key === 'Enter' && addManualItem()}
                />
              </div>
              <div className="form-group">
                <label>
                  {languageCode === 'hi-IN' ? 'मात्रा:' : 'Quantity:'}
                </label>
                <input
                  type="number"
                  value={manualItemQuantity}
                  onChange={(e) => setManualItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="form-input quantity-input"
                />
              </div>
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-primary" 
                onClick={addManualItem}
                disabled={!manualItemName.trim()}
              >
                {languageCode === 'hi-IN' ? '➕ शॉपिंग लिस्ट में जोड़ें' : '➕ Add to Shopping List'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setManualItemName('')
                  setManualItemQuantity(1)
                  setShowManualAdd(false)
                }}
              >
                {languageCode === 'hi-IN' ? 'रद्द करें' : 'Cancel'}
              </button>
            </div>
            <div className="manual-add-tip">
              💡 <strong>
                {languageCode === 'hi-IN' ? 'सुझाव:' : 'Tip:'}
              </strong> {
                languageCode === 'hi-IN' 
                  ? 'इसका उपयोग तब करें जब वॉइस रिकॉग्निशन सही काम नहीं कर रहा हो या आप आइटम मैन्युअली जोड़ना चाहते हों।'
                  : 'Use this when voice recognition isn\'t working perfectly or you want to add items manually.'
              }
            </div>
          </div>
        </div>
      )}

      {showInventory && (
        <div className="card">
          <div className="section-title">
            {showCategories ? 'Category Items' : selectedCategory ? `${selectedCategory} Items` : 'Inventory Search Results'}
            <button className="close-btn" onClick={() => { setShowInventory(false); setShowCategories(false); setSelectedCategory('') }}>✕</button>
          </div>
          <div className="inventory-grid">
            {searchResults.map(item => (
              <div key={item.id} className={`inventory-item ${!item.available ? 'unavailable' : ''}`} data-category={item.category}>
                <div className="item-header">
                  <span className="item-name">{item.name}</span>
                  <span className={`status ${item.available ? 'available' : 'unavailable'}`}>
                    {item.available ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="item-details">
                  <span className="category-tag" data-category={item.category}>{item.category}</span>
                  <span className="price">{item.price}</span>
                  <span className="location">📍 {item.location}</span>
                </div>
                {item.available && (
                  <div className="item-actions">
                    <button 
                      className="btn btn-primary add-to-list-btn"
                      onClick={() => addItemToList(item)}
                      title="Add to shopping list"
                    >
                      ➕ Add to List
                    </button>
                  </div>
                )}
              </div>
            ))}
            {searchResults.length === 0 && (
              <div className="no-results">
                <p>No items found</p>
                {selectedCategory && (
                  <p>Try adding some {selectedCategory} items to your inventory first!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCategories && (
        <div className="card">
          <div className="section-title">
            Browse by Category
            <div className="category-header-controls">
              <button className="btn btn-secondary" onClick={showCategoryHelpDialog}>
                ❓ Help
              </button>
              <button className="close-btn" onClick={() => { setShowCategories(false) }}>✕</button>
            </div>
          </div>
          
          {/* Category Search Bar */}
          <div className="category-search-section">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search categories (e.g., 'dairy', 'fruits', 'bread')..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="category-search-input"
              />
              {categorySearchQuery && (
                <button className="clear-search-btn" onClick={clearCategorySearch}>
                  ✕
                </button>
              )}
            </div>
            {categorySearchQuery && (
              <div className="search-info">
                Showing {filteredCategories.length} of {categoryList.length} categories
              </div>
            )}
          </div>

          <div className="categories-grid">
            {filteredCategories.map(category => (
              <div 
                key={category.name} 
                className="category-card"
                onClick={() => handleCategoryClick(category)}
                style={{ '--category-color': category.color }}
              >
                <div className="category-icon">{category.icon}</div>
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-description">{category.description}</p>
                  <div className="category-examples">
                    {category.examples.slice(0, 3).map(example => (
                      <span key={example} className="example-tag">{example}</span>
                    ))}
                    {category.examples.length > 3 && (
                      <span className="more-examples">+{category.examples.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && categorySearchQuery && (
              <div className="no-categories-found">
                <p>No categories found for "{categorySearchQuery}"</p>
                <p>Try searching for: dairy, produce, grains, protein, beverages, snacks, frozen, or pantry</p>
                <button className="btn btn-secondary" onClick={clearCategorySearch}>
                  Show All Categories
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCategoryHelp && (
        <div className="modal-overlay" onClick={() => setShowCategoryHelp(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 How to Use Categories</h2>
              <button className="close-btn" onClick={() => setShowCategoryHelp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="help-section">
                <h3>📱 Click Categories</h3>
                <p>Click on any category card above to see all items in that category.</p>
              </div>
              
              <div className="help-section">
                <h3>🎤 Voice Commands</h3>
                <div className="voice-examples">
                  <p><strong>Show category:</strong> "Show dairy category"</p>
                  <p><strong>Browse items:</strong> "What's in produce?"</p>
                  <p><strong>Check stock:</strong> "Show me all grains"</p>
                  <p><strong>Find items:</strong> "What beverages do you have?"</p>
                </div>
              </div>

              <div className="help-section">
                <h3>🔍 Category Examples</h3>
                <div className="category-examples-grid">
                  {categoryList.slice(0, 4).map(category => (
                    <div key={category.name} className="help-category-item">
                      <span className="help-category-icon">{category.icon}</span>
                      <span className="help-category-name">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="help-section">
                <h3>💡 Pro Tips</h3>
                <ul className="pro-tips">
                  <li>Use voice commands for hands-free browsing</li>
                  <li>Click categories to quickly filter inventory</li>
                  <li>Combine with search: "Show dairy under $5"</li>
                  <li>Add items to your shopping list from any category</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowCategoryHelp(false)}>
                Got it! 👍
              </button>
            </div>
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
          {suggested.length > 0 ? (
            <>
              {suggested.filter(s => s.type === 'recent').length > 0 && (
                <div className="suggestion-group">
                  <div className="suggestion-label">🕒 Recently Added:</div>
                  <div className="suggestion-buttons">
                    {suggested.filter(s => s.type === 'recent').map(s => (
                      <button 
                        className="suggestion-btn recent" 
                        key={`recent-${s.name}`} 
                        onClick={() => handleParsed({ action: ACTIONS.ADD, item: s.name, quantity: 1 })}
                        title={`Add ${s.name} again`}
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {suggested.filter(s => s.type === 'popular').length > 0 && (
                <div className="suggestion-group">
                  <div className="suggestion-label">⭐ Popular in List:</div>
                  <div className="suggestion-buttons">
                    {suggested.filter(s => s.type === 'popular').map(s => (
                      <button 
                        className="suggestion-btn popular" 
                        key={`popular-${s.name}`} 
                        onClick={() => handleParsed({ action: ACTIONS.ADD, item: s.name, quantity: 1 })}
                        title={`Add more ${s.name}`}
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {suggested.filter(s => s.type === 'frequent').length > 0 && (
                <div className="suggestion-group">
                  <div className="suggestion-label">📚 Frequently Used:</div>
                  <div className="suggestion-buttons">
                    {suggested.filter(s => s.type === 'frequent').map(s => (
                      <button 
                        className="suggestion-btn frequent" 
                        key={`frequent-${s.name}`} 
                        onClick={() => handleParsed({ action: ACTIONS.ADD, item: s.name, quantity: 1 })}
                        title={`Add ${s.name} from history`}
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-suggestions">
              <span>💡 Add some items to see suggestions!</span>
              <span className="suggestion-tip">Suggestions will show recently added items, popular items in your list, and frequently used items from your history.</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <span className="list-title">
          <strong>Shopping List ({items.length} items)</strong>
          {consolidatedItems.length !== items.length && (
            <span className="consolidated-info">
              📦 {consolidatedItems.length} unique items
            </span>
          )}
        </span>
        <ul className="list">
          {consolidatedItems.map(it => (
            <li key={`${it.name}-${it.category}`} className="item-row">
              <span className="item-name">
                <span className="item-main-name">{it.name}</span>
                <span className="item-meta">
                  {it.quantity > 1 ? `× ${it.quantity}` : ''} {it.unit || ''} 
                  <span className="category-badge">{it.category}</span>
                  {it.count > 1 && (
                    <span className="duplicate-count" title={`Added ${it.count} times`}>
                      🔄 {it.count}
                    </span>
                  )}
                </span>
              </span>
              <div className="item-actions">
                {it.count > 1 && (
                  <button 
                    className="item-action-btn info" 
                    title={`This item was added ${it.count} times`}
                  >
                    ℹ️
                  </button>
                )}
                <button 
                  className="item-remove" 
                  onClick={() => removeConsolidatedItem(it.name, it.category)}
                  title={it.count > 1 ? `Remove all ${it.count} instances of ${it.name}` : `Remove ${it.name}`}
                >
                  {it.count > 1 ? `Remove All` : 'Remove'}
                </button>
              </div>
            </li>
          ))}
          {consolidatedItems.length === 0 && (
            <li className="item-row" style={{ borderBottom: 'none' }}>
              No items yet. Try saying "Add 2 bottles of water" or "दो बोतल पानी जोड़ो"
            </li>
          )}
        </ul>
      </div>

      {showVoiceHelp && (
        <div className="modal-overlay" onClick={() => setShowVoiceHelp(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 Voice Commands</h2>
              <button className="close-btn" onClick={() => setShowVoiceHelp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="help-section">
                <h3>Add Items</h3>
                <p>"Add 2 bottles of water"</p>
                <p>"Buy 1 kg apples"</p>
                <p className="hindi-example">"दो बोतल पानी जोड़ो"</p>
                <p className="hindi-example">"एक किलो सेब खरीदो"</p>
              </div>
              <div className="help-section">
                <h3>Remove Items</h3>
                <p>"Remove milk"</p>
                <p>"Delete last item"</p>
                <p>"Remove item number 2"</p>
                <p className="hindi-example">"दूध हटाओ"</p>
                <p className="hindi-example">"आखिरी चीज़ हटाओ"</p>
              </div>
              <div className="help-section">
                <h3>Search & Inventory</h3>
                <p>"Check if milk is available"</p>
                <p>"Search for bread under $5"</p>
                <p>"Show dairy category"</p>
                <p className="hindi-example">"दूध उपलब्ध है या नहीं"</p>
                <p className="hindi-example">"डेयरी श्रेणी दिखाओ"</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowVoiceHelp(false)}>
                Got it! 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
