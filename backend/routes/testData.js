const express = require('express');
const router = express.Router();

// Test data endpoints for development
router.get('/status', (req, res) => {
  res.json({
    message: 'Test data service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Generate sample test data
router.get('/sample', (req, res) => {
  res.json({
    message: 'Sample test data endpoint',
    data: {
      users: 10,
      collections: 25,
      routes: 5,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;