const express = require('express');
const router = express.Router();

// Test tracking endpoints for development
router.get('/status', (req, res) => {
  res.json({ 
    message: 'Test tracking service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;