/**
 * 风格列表路由
 */

const express = require('express');
const router = express.Router();
const { getStyles } = require('../services/styleLoader');

router.get('/styles', (req, res) => {
  const styles = getStyles().map(s => ({ name: s.name }));
  res.json({ styles });
});

module.exports = router;
