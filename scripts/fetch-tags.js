// Script to fetch all tags from Polymarket API
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const API_BASE = 'https://gamma-api.polymarket.com'
const TAGS_FILE = join(__dirname, '..', 'tags.json')
const CATEGORIES_FILE = join(__dirname, '..', 'tags-categories.json')
const MAX_ID = 1000 // Maximum ID to check

const tags = []
const errors = []

async function fetchTag(id) {
  try {
    const url = `${API_BASE}/tags/${id}`
    console.log(`Checking tag ID: ${id}...`)
    
    const response = await fetch(url)
    
    if (response.ok) {
      const tag = await response.json()
      if (tag && tag.id) {
        tags.push(tag)
        console.log(`✅ Found tag: ${tag.label} (ID: ${tag.id})`)
        return tag
      }
    } else if (response.status === 404) {
      // Tag doesn't exist, this is normal
      return null
    } else {
      console.log(`⚠️ Error for ID ${id}: ${response.status}`)
      errors.push({ id, status: response.status })
    }
  } catch (error) {
    console.error(`❌ Error fetching tag ${id}:`, error.message)
    errors.push({ id, error: error.message })
  }
  
  return null
}

async function fetchAllTags() {
  console.log('🚀 Starting to collect tags from Polymarket API...\n')
  
  // Create an array of promises for parallel requests (in batches of 10)
  const batchSize = 10
  
  for (let startId = 1; startId <= MAX_ID; startId += batchSize) {
    const endId = Math.min(startId + batchSize - 1, MAX_ID)
    const promises = []
    
    for (let id = startId; id <= endId; id++) {
      promises.push(fetchTag(id))
    }
    
    await Promise.all(promises)
    
    // Small delay between batches to avoid overwhelming the API
    if (endId < MAX_ID) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`📊 Progress: checked ${endId}/${MAX_ID}, found tags: ${tags.length}\n`)
  }
  
  console.log('\n📋 Results:')
  console.log(`   ✅ Tags found: ${tags.length}`)
  console.log(`   ❌ Errors: ${errors.length}`)
  
  if (errors.length > 0) {
    console.log('\n⚠️ Errors:')
    errors.slice(0, 10).forEach(err => {
      console.log(`   ID ${err.id}: ${err.status || err.error}`)
    })
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`)
    }
  }
  
  // Sort tags by ID
  tags.sort((a, b) => parseInt(a.id) - parseInt(b.id))
  
  // Save to JSON file
  fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2))
  console.log(`\n💾 Tags saved to file: ${TAGS_FILE}`)
  
  // Create a more convenient categories file for use in code
  const categoriesMap = {}
  tags.forEach(tag => {
    categoriesMap[tag.id] = {
      id: tag.id,
      name: tag.label,
      slug: tag.slug
    }
  })
  
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categoriesMap, null, 2))
  console.log(`💾 Categories for code saved to: ${CATEGORIES_FILE}`)
  
  // Output list of tags
  console.log('\n📝 List of all found tags:')
  tags.forEach(tag => {
    console.log(`   ${tag.id.padStart(4)}: ${tag.label} (${tag.slug})`)
  })
}

// Run
fetchAllTags().catch(console.error)

