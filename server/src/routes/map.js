import express from 'express';
// Note: If you are on Node 18+, fetch is built-in. If lower, use 'node-fetch'
const router = express.Router();

router.get('/address-autocomplete', async (req, res) => {
  try {
    const { text } = req.query;
    const API_KEY = process.env.GEOAPIFY_API_KEY; 

    if (!API_KEY) {
      return res.status(500).json({ error: "Backend .env missing API Key" });
    }

    // Proxying to Geoapify with Philippines filter
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${API_KEY}&filter=countrycode:ph&limit=5`;

    const response = await fetch(url);
    const data = await response.json();
    
    // Transform GeoJSON to the clean format our Modal expects
    const suggestions = data.features?.map(feature => ({
      formatted: feature.properties.formatted,
      street: feature.properties.street || feature.properties.name || "",
      barangay: feature.properties.district || feature.properties.suburb || feature.properties.village || "",
      city: feature.properties.city || feature.properties.municipality || "",
      postalCode: feature.properties.postcode || "",
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0]
    })) || [];

    res.json(suggestions);
  } catch (error) {
    console.error("Map Proxy Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;