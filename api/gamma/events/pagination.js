export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const queryParams = new URLSearchParams(req.query).toString()
    const url = `https://gamma-api.polymarket.com/events/pagination?${queryParams}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `HTTP error! status: ${response.status}` })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching events:', error)
    return res.status(500).json({ error: 'Failed to fetch events' })
  }
}

