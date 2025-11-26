export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  try {
    const response = await fetch(`https://gamma-api.polymarket.com/events/${id}`, {
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
    console.error('Error fetching event:', error)
    return res.status(500).json({ error: 'Failed to fetch event' })
  }
}

