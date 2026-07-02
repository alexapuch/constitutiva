import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key start:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');

if (!apiKey) {
    console.error('No key found!');
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
        headers: {
            "User-Agent": "aistudio-build",
        },
    },
});

const promptText = `Analyze this business to estimate a full civil protection risk analysis:
Business Name (Razón Social): NUEVA EMPRESA
Commercial Name: MI TIENDA
Address: CALLE 10 | PLAYA DEL CARMEN
Business Activity / Giro: TIENDA DE ABARROTES
Square Meters (m²): 50
Provided Fixed Population: 1
Provided Floating Population: 3

Please generate a JSON object matching this exact structure:
{
  "direccion": "string",
  "antiguedad": "string (e.g. '5', '10', 'N.D.')",
  "poblacionFija": number,
  "poblacionFlotante": number,
  "croquis": {
    "norteGeografico": boolean,
    "riesgosInternos": boolean,
    "zonasAltoRiesgo": boolean,
    "equiposEmergencia": boolean,
    "rutasEvacuacion": boolean,
    "zonaConteo": boolean
  },
  "estructural": {
    "inclinacion": boolean,
    "separacion": boolean,
    "deformacion": boolean,
    "grietasMuros": boolean,
    "hundimiento": boolean,
    "grietasPiso": boolean,
    "filtracion": boolean,
    "danosEscaleras": boolean
  },
  "escalerasServicio": {
    "homogeneas": boolean,
    "barandal": boolean,
    "pasamanos": boolean,
    "cinta": boolean,
    "iluminacion": boolean,
    "estado": "BUENO | REGULAR | MALO"
  },
  "escalerasEmergencia": {
    "homogeneas": boolean,
    "barandal": boolean,
    "pasamanos": boolean,
    "cinta": boolean,
    "iluminacion": boolean,
    "estado": "BUENO | REGULAR | MALO"
  },
  "instalaciones": {
    "hidrosanitaria": {
      "cisterna": boolean,
      "tinaco": boolean,
      "danosTuberia": boolean,
      "danosLlaves": boolean,
      "dictamenTecnico": boolean
    },
    "gas": {
      "tanqueEstacionario": boolean,
      "tanqueMovil": boolean,
      "calentadorAgua": boolean,
      "dictamenTecnico": boolean,
      "capacidad": "string",
      "fugas": boolean,
      "estado": "BUENO | REGULAR | MALO",
      "recomendaciones": "string"
    },
    "electrica": {
      "subestacion": boolean,
      "tableros": boolean,
      "cableado": boolean,
      "contactos": boolean,
      "interruptores": boolean,
      "lamparas": boolean,
      "lamparasEmergencia": boolean,
      "plantaEmergencia": boolean,
      "transformador": boolean,
      "dictamenTecnico": boolean,
      "recomendaciones": "string",
      "estado": "BUENO | REGULAR | MALO"
    },
    "especiales": {
      "bombasAgua": boolean,
      "ac": boolean,
      "extractores": boolean,
      "ventiladores": boolean,
      "cercaElectrica": boolean,
      "alarmaGeneral": boolean,
      "presurizadores": boolean,
      "recomendaciones": "string"
    }
  },
  "caer": {
    "lamparas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "ventiladores": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "pantallas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "evaporador": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "cristaleria": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "canceles": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "techos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "plafones": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "repisas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "cuadros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "espejos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosToxicos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosInflamables": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosCorrosivos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "otros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "recomendaciones": "string"
  },
  "deslizarse": {
    "escritorios": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "mesas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "sillas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "refrigeradores": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "ruedas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "recomendaciones": "string"
  },
  "volcar": {
    "computo": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "libreros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "roperos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "lockers": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "archiveros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "estantes": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "vitrinas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "tanquesGas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "subdivisiones": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "recomendaciones": "string"
  },
  "acabados": {
    "lambrinesIncombustibles": boolean,
    "lambrinesCombustibles": boolean,
    "pisosDesniveles": boolean,
    "pisosFalsos": boolean,
    "losetasAzulejos": boolean,
    "cantidadM2": number,
    "estado": "BUENO | REGULAR | MALO",
    "recomendaciones": "string"
  },
  "equiposEmergencia": {
    "alarmas": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "detectoresHumo": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "extintores": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "trajeBombero": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "casco": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "herramienta": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "manta": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "rutaEvacuacion": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "salidaEmergencia": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "puntoReunion": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "senalizacion": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "brigadas": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "comunicacion": { "siNo": boolean, "cantidad": number, "estado": "BUENO" },
    "zonasSeguridad": { "siNo": boolean, "cantidad": number, "estado": "BUENO" }
  },
  "otrosRiesgos": {
    "inflamar": { "combustibles": boolean, "solventes": boolean, "papelCarton": boolean, "recomendaciones": "string" },
    "propiciar": { "cigarros": boolean, "colillas": boolean, "velas": boolean, "instalacionGas": boolean, "cafeteras": boolean, "contactos": boolean, "apagadores": boolean, "cablesMalEstado": boolean, "microondas": boolean, "recomendaciones": "string" },
    "obstaculizar": { "tapetes": boolean, "macetas": boolean, "archiveros": boolean, "pizarrones": boolean, "muebles": boolean, "equiposLimpieza": boolean, "herramientas": boolean, "puertasCerradas": boolean, "lavadoras": boolean, "bombeo": boolean, "recomendaciones": "string" }
  },
  "riesgosExternos": {
    "entorno": {
      "tanquesElevados": { "siNo": boolean, "distancia": "string" },
      "postesMalEstado": { "siNo": boolean, "distancia": "string" },
      "torresAltaTension": { "siNo": boolean, "distancia": "string" },
      "transformadores": { "siNo": boolean, "distancia": "string" },
      "inmueblesDanados": { "siNo": boolean, "distancia": "string" },
      "banquetas": { "siNo": boolean, "distancia": "string" },
      "alcantarillas": { "siNo": boolean, "distancia": "string" },
      "arboles": { "siNo": boolean, "distancia": "string" },
      "callesTransitadas": { "siNo": boolean, "distancia": "string" },
      "fabricasGas": { "siNo": boolean, "distancia": "string" },
      "tanquesGasLp": { "siNo": boolean, "distancia": "string" },
      "gasolineras": { "siNo": boolean, "distancia": "string" },
      "espectaculares": { "siNo": boolean, "distancia": "string" },
      "almacenesPeligrosos": { "siNo": boolean, "distancia": "string" },
      "fabricas": { "siNo": boolean, "distancia": "string" },
      "costas": { "siNo": boolean, "distancia": "string" },
      "tallerSolventes": { "siNo": boolean, "distancia": "string" }
    },
    "socioOrganizativo": {
      "accidentes": { "vehiculosParticulares": boolean, "vehiculosPeligrosos": boolean, "vehiculosPasajeros": boolean, "aereos": boolean, "otros": boolean },
      "delictivo": { "robo": boolean, "roboViolencia": boolean, "invasion": boolean, "interrupcion": boolean, "sabotajeServicios": boolean, "sabotajePrivados": boolean, "otros": boolean },
      "disturbios": { "marchas": boolean, "plantones": boolean, "vandalismo": boolean, "otros": boolean },
      "lugaresPublicos": { "bares": boolean, "cantinas": boolean, "antros": boolean, "iglesias": boolean, "restaurantesBares": boolean, "salones": boolean, "construcciones": boolean, "hospitales": boolean, "centrosNocturnos": boolean }
    },
    "geologico": { "fallas": boolean, "sismos": boolean, "deslizamiento": boolean, "hundimiento": boolean },
    "quimico": { "incendios": boolean, "explosiones": boolean, "fugas": boolean, "radiaciones": boolean },
    "hidrometeorologico": {
      "inundacion": { "rio": boolean, "lago": boolean, "lluvia": boolean, "mar": boolean },
      "otros": { "vientosFuertes": boolean, "huracan": boolean, "mareaTormenta": boolean, "tormentaElectrica": boolean, "lluviaTorrencial": boolean, "tromba": boolean, "tornado": boolean, "granizo": boolean, "sequia": boolean }
    },
    "sanitario": {
      "epidemia": { "siNo": boolean, "vulnerableA": "string" },
      "plaga": { "siNo": boolean, "vulnerableA": "string" },
      "envenenamiento": { "siNo": boolean, "vulnerableA": "string" }
    }
  }
}

Return ONLY the raw JSON object. Do not include markdown formatting or backticks.`;

async function run() {
    console.log('Calling Gemini with plain JSON prompt...');
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptText,
            config: {
                responseMimeType: "application/json",
            }
        });
        console.log('Got response. Text length:', response.text?.length);
        console.log('Response (first 300 chars):', response.text?.substring(0, 300));
        // Parse it to verify validity
        const parsed = JSON.parse(response.text.trim());
        console.log('Parsed successfully! Domicilio:', parsed.direccion);
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

run();
