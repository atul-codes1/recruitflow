require('dotenv').config({ path: '.env.local' });

async function getUpstashLogs() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.error('No QSTASH_TOKEN found in .env.local');
    return;
  }

  try {
    const res = await fetch('https://qstash.upstash.io/v2/events', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error(`Upstash API returned ${res.status}: ${await res.text()}`);
      return;
    }

    const data = await res.json();
    console.log('--- UPSTASH QSTASH RECENT EVENTS ---');
    if (!data.events || data.events.length === 0) {
       console.log('No events found in Upstash. This means your Vercel app is not even successfully publishing messages to Upstash!');
       return;
    }

    // Only show the last 10 events
    const recentEvents = data.events.slice(0, 10);
    
    for (const event of recentEvents) {
       console.log(`\nTime: ${new Date(event.time).toISOString()}`);
       console.log(`Message ID: ${event.messageId}`);
       console.log(`State: ${event.state}`);
       console.log(`URL: ${event.url}`);
       if (event.error) {
          console.log(`ERROR: ${event.error}`);
       }
       if (event.response) {
          console.log(`Response Status: ${event.response.status}`);
          console.log(`Response Body: ${event.response.body}`);
       }
    }
  } catch (err) {
    console.error('Failed to fetch Upstash logs:', err);
  }
}

getUpstashLogs();
