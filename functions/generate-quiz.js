const fetch = require('node-fetch');
exports.handler = async function(event) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('APIキーがNetlify環境変数に設定されていません。');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'サーバー側でAPIキーが設定されていません。' }),
    };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    const { prompt } = JSON.parse(event.body);
    if (!prompt) {
        return { statusCode: 400, body: JSON.stringify({ error: 'プロンプトがありません。' }) };
    }
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!apiResponse.ok) {
      let errorBody = `AIサーバーからの不明なエラー (Status: ${apiResponse.status})`;
      try {
        errorBody = await apiResponse.text();
      } catch (e) { /* ignore */ }
      console.error('API Error:', errorBody);
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({ error: `AIサーバーでエラーが発生しました。` }),
      };
    }

    const result = await apiResponse.json();
    
    // ★変更点：AIの応答がブロックされた場合の詳細なエラーハンドリングを追加
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].finishReason && result.candidates[0].finishReason !== 'STOP') {
        const reason = result.candidates[0].finishReason;
        let message = `AIが応答を生成できませんでした。理由: ${reason}`;
        if (reason === 'SAFETY') {
            message = 'AIが安全上の理由で応答をブロックしました。より一般的な質問をお試しください。';
        } else if (reason === 'MAX_TOKENS') {
            message = 'AIの応答が長すぎるため、途中で中断されました。';
        }
        console.warn('AI response stopped. Reason:', reason);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: message }),
        };
    }

    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
       console.error("予期しないAPI応答形式:", result);
       return {
        statusCode: 500,
        body: JSON.stringify({ error: "AIからの応答が予期した形式ではありません。内容を確認してください。" }),
      };
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result.candidates[0].content.parts[0].text }),
    };
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `サーバー処理中に予期せぬエラーが発生しました: ${error.message}` }),
    };
  }
};
