const apiKey = 'AIzaSyB7xl3Tswlbc_w5_ousKu8BynBi3tpmTN4';
const prompt = 'Return a json with outline. Topic: test';
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  }),
}).then(async (res) => {
  console.log(res.status, await res.text());
}).catch(console.error);
