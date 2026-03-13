import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function handleChatGPTMessage(userId: string, userInput: string) {
  const systemPrompt = `
  You help non-native English speakers sound clear and natural in short, casual messages—like stand-up updates or Slack. Improve the given text so it reads like spoken language: clear, friendly, and easy to understand.

Rules:
- Use simple, everyday words. Avoid fancy or complicated words.
- Keep it short and to the point, like something you’d say in a stand-up or type in Slack.
- Fix grammar and phrasing so it sounds natural.
- Keep the same tone (casual/neutral). Do not make it formal or stiff.
- Output only the revised text. No explanations or extra commentary.
- If the text is already clear, return it with only small fixes or as-is.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return 'No response from ChatGPT';
    }

    return content;
  } catch (error) {
    console.error('OpenAI ChatGPT API Error', error);
    return 'Error calling ChatGPT';
  }
}

