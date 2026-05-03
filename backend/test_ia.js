const { analyzeSentiment } = require('./src/utils/aiService');
require('dotenv').config();

async function test() {
  console.log('--- TEST DE L\'IA DE SENTIMENT ---');
  
  const tests = [
    { text: "C'est parfait, merci beaucoup !", rating: 5 },
    { text: "Le technicien est arrivé en retard et n'avait pas le matériel", rating: 1 },
    { text: "C'était correct, sans plus.", rating: 3 },
    { text: "ممتاز جدا، شكرا لكم", rating: 5 }, // "Excellent, thank you" in Arabic
    { text: "التجربة كانت سيئة للغاية", rating: 1 },   // "Experience was very bad" in Arabic
  ];

  for (const t of tests) {
    const sentiment = await analyzeSentiment(t.text, t.rating);
    console.log(`\nTexte: "${t.text}"`);
    console.log(`Note: ${t.rating}/5`);
    console.log(`Résultat IA: ${sentiment}`);
  }
}

test();
