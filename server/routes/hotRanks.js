/**
 * 热榜路由
 */

const express = require('express');
const router = express.Router();
const { fetchHotRanks, getPlatforms } = require('../services/hotRanks');

// 获取平台列表
router.get('/platforms', (req, res) => {
  res.json({ platforms: getPlatforms() });
});

// 获取指定平台热榜
router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const data = await fetchHotRanks(platform);
    res.json({ platform, data });
  } catch (err) {
    console.error('Hot ranks fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
