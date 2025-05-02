import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Transférer la requête au serveur Python aiortc
    const response = await fetch('http://localhost:8080/offer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Erreur dans la réponse du serveur aiortc: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors du traitement de l\'offre WebRTC:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de l\'offre WebRTC' },
      { status: 500 }
    );
  }
}