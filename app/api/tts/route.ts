import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const { text } = await req.json()

    // roep hier jouw TTS provider aan, bv. ElevenLabs of OpenAI
    // dit is pseudo-code, maar qua idee:
    const ttsRes = await fetch('https://tts-provider.com/v1/tts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.TTS_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voice: 'nederlandse_stem_id',
            model: 'neural-of-zo',
        }),
    })

    const audioBuffer = await ttsRes.arrayBuffer()

    return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'audio/mpeg', // of wat je provider teruggeeft
        },
    })
}
