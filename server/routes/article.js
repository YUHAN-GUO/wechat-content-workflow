/**
 * 文章生成路由 - SSE 流式
 */

const express = require('express');
const router = express.Router();
const ai = require('../services/ai');
const { getStyle } = require('../services/styleLoader');

router.post('/article', async (req, res) => {
  try {
    const { topic, requirements = '', style: styleName, apiUrl, apiKey, modelName } = req.body;

    if (!topic || !apiUrl || !apiKey || !modelName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 加载风格
    let systemPrompt = '你是一位专业的内容创作者。';
    if (styleName) {
      const styleContent = getStyle(styleName);
      if (styleContent) {
        systemPrompt = styleContent;
      }
    }

    const userPrompt = `主题：${topic}\n写作要求：${requirements || '无特殊要求'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // SSE 设置
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await ai.createChatCompletionStream({
      apiUrl,
      apiKey,
      modelName,
      messages,
      onChunk: (chunk, full) => {
        res.write(`data: ${JSON.stringify({ chunk, full })}\n\n`);
      },
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Article generation error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
