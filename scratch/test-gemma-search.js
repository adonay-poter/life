const apiKey = 'AIzaSyB7xl3Tswlbc_w5_ousKu8BynBi3tpmTN4';
const prompt = 'Test search';
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]
  }),
}).then(async (res) => {
  console.log(res.status, await res.text());
}).catch(console.error);
