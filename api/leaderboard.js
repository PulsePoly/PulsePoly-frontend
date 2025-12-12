export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get timeframe from query parameters (default to 'all')
    const { timeframe = 'all' } = req.query;

    // Map timeframe to Polymarket API parameters
    // Polymarket API expects: ?interval=all|month|week
    const intervalMap = {
      'all': 'ALL',
      'month': 'MONTH',
      'week': 'WEEK'
    };

    const interval = intervalMap[timeframe] || 'ALL';

    // Fetch from Polymarket Data API
    const polymarketUrl = `https://data-api.polymarket.com/v1/leaderboard?timePeriod=${interval}`;
    
    console.log('Fetching leaderboard from:', polymarketUrl);

    const response = await fetch(polymarketUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return the data
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      message: error.message 
    });
  }
}

