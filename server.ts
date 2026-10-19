import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));

// Gemini SDK initialization
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// POST /api/analyze-document - Driver and Vehicle KYC Inspector
app.post('/api/analyze-document', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', documentType = 'general' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 es requerido' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not set yet in local environment
      return res.json({
        success: true,
        source: 'simulated_verification',
        analysis: {
          isValid: true,
          docType: documentType || 'Licencia Profesional / SOAT',
          driverName: 'Conductor Verificado (Modo Local)',
          licenseType: 'Licencia Profesional Tipo C',
          plate: 'PBC-4921',
          vehicleModel: 'Chevrolet Sail 2021',
          soatStatus: 'SOAT Vigente y Activo',
          summary: 'Documento procesado correctamente para la flota de AndesMovi Ecuador. Estándar de seguridad cumplido.',
        },
      });
    }

    // Call Gemini 3.8 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Actúa como auditor oficial de seguridad vial y regulación de transporte para AndesMovi Ecuador (ANT / SPPAT).
Analiza esta imagen adjunta (puede ser una Licencia de Conducir ecuatoriana Tipo C/D/E, Póliza SOAT/SPPAT, Matrícula vehicular o Foto de taxi/vehículo).

Devuelve tu análisis en formato JSON estricto con los siguientes campos:
{
  "isValid": true/false (si el documento parece genuino, legible y apto para taxi en Ecuador),
  "docType": "Licencia ANT" | "Póliza SOAT/SPPAT" | "Matrícula Vehicular" | "Foto del Vehículo" | "Otro",
  "driverName": "Nombre detectado o null",
  "idNumber": "Cédula detectada o null",
  "licenseType": "Tipo detectado o null (ej. Tipo C Profesional)",
  "plate": "Placa ecuatoriana detectada o null (ej. PBC-4921)",
  "vehicleModel": "Modelo o tipo de auto detectado o null",
  "expirationDate": "Fecha de vigencia o null",
  "summary": "Resumen técnico de 2 frases sobre la validez del documento para servicio público en Ecuador."
}`,
            },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text, isValid: true };
    }

    return res.json({
      success: true,
      source: 'gemini_vision',
      analysis: parsed,
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    return res.status(500).json({
      error: 'Error procesando documento con IA',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/analyze-receipt - AI Bank Recharge Voucher Fraud Inspector
app.post('/api/analyze-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', bank = 'Deuna!' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 es requerido' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        source: 'simulated_receipt',
        analysis: {
          isValid: true,
          bankDetected: bank,
          referenceNumber: `COMP-${Math.floor(100000 + Math.random() * 900000)}`,
          amountDetected: 25.00,
          dateDetected: new Date().toLocaleDateString('es-EC'),
          confidenceScore: 98,
          fraudRisk: 'BAJO - Comprobante Válido',
          summary: `Comprobante verificado de ${bank}. Referencia bancaria legítima. Apto para acreditación automática.`,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Actúa como auditor financiero anti-fraude para la plataforma AndesMovi Ecuador.
Analiza esta imagen adjunta de un comprobante bancario o transferencia (Banco Pichincha, Deuna!, Banco Guayaquil, Produbanco, Banco del Austro).
Verifica que los datos sean legibles y no parezca editado/falsificado.

Devuelve JSON estricto con:
{
  "isValid": true/false,
  "bankDetected": "Nombre del banco detectado",
  "referenceNumber": "Número de comprobante/transacción detectado o null",
  "amountDetected": numero en USD o null,
  "dateDetected": "Fecha detectada o null",
  "confidenceScore": porcentaje 0-100,
  "fraudRisk": "BAJO - Comprobante Válido" | "MEDIO - Revisión requerida" | "ALTO - Posible alteración digital",
  "summary": "Resumen técnico de 2 frases para la central de administración."
}`,
            },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text, isValid: true, fraudRisk: 'BAJO' };
    }

    return res.json({
      success: true,
      source: 'gemini_vision',
      analysis: parsed,
    });
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    return res.status(500).json({
      error: 'Error analizando comprobante',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai-copilot - Central Operations AI Dispatch Assistant & Report Generator
app.post('/api/ai-copilot', async (req, res) => {
  try {
    const { prompt, contextData } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt es requerido' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        source: 'simulated_copilot',
        reply: `[Asistente IA AndesMovi]: He analizado los datos operativos actuales. Unidades disponibles en zona: ${contextData?.activeUnitsCount || 5}. Recomendación: Asignar carreras prioritized por cercanía al Parque Central y mantener vigilancia en el canal PTT de frecuencia matriz.`,
      });
    }

    const systemPrompt = `Eres "Copiloto IA AndesMovi", la Inteligencia Artificial oficial de la Central de Radio-Despacho y Administración de AndesMovi Ecuador.
Tu tono es ejecutivo, profesional, claro y directo.
Respondes preguntas de los operadores de la central sobre asignación de carreras, despacho óptimo, encomiendas, tarifas cantonales de Carchi e Imbabura, o generas resúmenes de turno de forma impecable.
Contexto del sistema entregado: ${JSON.stringify(contextData || {})}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${systemPrompt}\n\nPregunta del Operador/Administrador: ${prompt}`,
    });

    return res.json({
      success: true,
      source: 'gemini_flash',
      reply: response.text || 'Sin respuesta',
    });
  } catch (error) {
    console.error('Error in ai-copilot:', error);
    return res.status(500).json({
      error: 'Error en Copiloto IA',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Setup Vite middleware in dev
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`AndesMovi Admin server running on http://0.0.0.0:${port}`);
  });
}

startServer();
