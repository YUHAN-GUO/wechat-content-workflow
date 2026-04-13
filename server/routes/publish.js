/**
 * 微信发布路由
 */

const express = require('express');
const router = express.Router();
const WeChatPublisher = require('../services/wechatPublisher');
const fetch = require('node-fetch');

router.post('/publish', async (req, res) => {
  try {
    const { appid, secret, title, content, author = '作者', digest = '', coverUrl } = req.body;

    if (!appid || !secret || !title || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const publisher = new WeChatPublisher(appid, secret);

    // 获取 access_token
    const accessToken = await publisher.getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: '获取 access_token 失败，请检查 AppID 和 Secret' });
    }

    // 处理封面图
    let thumbMediaId = null;
    if (coverUrl) {
      // 下载封面图
      console.log('📥 正在下载封面图...');
      const imageResponse = await fetch(coverUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        thumbMediaId = await publisher.uploadImage(imageBuffer);
      }
    }

    // 如果没有封面图或上传失败，使用默认封面
    if (!thumbMediaId) {
      console.log('📌 使用默认封面...');
      const defaultCoverBuffer = await publisher.generateDefaultCover(title);
      if (defaultCoverBuffer) {
        thumbMediaId = await publisher.uploadImage(defaultCoverBuffer);
      }
    }

    // 转换 Markdown 为微信 HTML
    const htmlContent = publisher.markdownToWechatHTML(content);

    // 创建草稿
    const mediaId = await publisher.createDraft({
      title,
      content: htmlContent,
      author,
      digest,
      thumbMediaId,
    });

    if (mediaId) {
      res.json({
        success: true,
        mediaId,
        message: '文章已成功保存到草稿箱',
      });
    } else {
      res.status(500).json({ error: '创建草稿失败' });
    }
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
