# Set up the weather widget

This guide configures the homeMaker weather widget, which shows current conditions and a short forecast on the dashboard.

## Prerequisites

- A free [OpenWeatherMap](https://openweathermap.org) account
- Your home's latitude and longitude

## Step 1: Get an OpenWeatherMap API key

1. Sign up at [openweathermap.org](https://openweathermap.org/appid).
2. Go to **API keys** in your account.
3. Copy the default key (or create a new one).

New keys activate within a few minutes.

## Step 2: Find your coordinates

You can look up coordinates on [latlong.net](https://www.latlong.net) by entering your city or address.

For example, Austin, TX is approximately `30.2672° N, 97.7431° W`.

## Step 3: Configure environment variables

Add these to your `.env` file:

```bash
OPENWEATHERMAP_API_KEY=your-api-key-here
OPENWEATHERMAP_LAT=30.2672
OPENWEATHERMAP_LON=-97.7431
```

Restart the server after updating `.env`.

## Step 4: Verify the widget

1. Open homeMaker at `http://localhost:3007`.
2. The weather widget on the dashboard should show current temperature, conditions, and a short forecast.

If the widget shows an error, check:

- The API key is correct and activated
- Latitude and longitude are valid decimal values
- The server was restarted after the `.env` change

## What the widget shows

| Data | Source |
| --- | --- |
| Current temperature | OpenWeatherMap Current Weather API |
| Conditions (clear, rain, snow, etc.) | OpenWeatherMap Current Weather API |
| High/low for today | OpenWeatherMap One Call API |
| 3-day forecast | OpenWeatherMap One Call API |

The widget refreshes every 30 minutes.

## Next steps

- [Connect Home Assistant sensors](./home-assistant.md)
- [Sensor module reference](../modules/sensors.md)
