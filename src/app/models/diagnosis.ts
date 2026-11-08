// Contrato de /telltales y /garage/:plate/diagnoses (ver docs/API.md del backend).
// Con IA, el modelo redacta la explicación y el servidor aplica su piso de seguridad; con la lista, sale del catálogo.
// Aquí solo se muestra: la urgencia y la orden de detenerse las decide siempre el servidor.

export type TelltaleSeverity = 'rojo' | 'amarillo' | 'informativo';

/** Del más urgente al menos urgente: el orden en que se agrupa la lista de testigos. */
export const SEVERITIES: readonly TelltaleSeverity[] = ['rojo', 'amarillo', 'informativo'];

/** Texto del semáforo. El color nunca va solo. */
export const SEVERITY_LABEL: Record<TelltaleSeverity, string> = {
  rojo: 'Detente',
  amarillo: 'Revísalo pronto',
  informativo: 'No es una falla',
};

/** Rojo sin orden de detenerse (airbag): el vehículo puede moverse, pero hay que revisarlo hoy. */
export const RED_NO_STOP_LABEL = 'Revísalo hoy';

/** Un rojo solo deja de ordenar detenerse si el servidor lo dice de forma explícita. */
export const ordersStop = (item: { debeDetenerse?: boolean }): boolean =>
  item.debeDetenerse !== false;

export const DIAGNOSIS_DISCLAIMER =
  'Orientación general. Un mecánico debe confirmar el diagnóstico.';

export interface TelltaleSummary {
  id: string;
  nombre: string;
  alias: string[];
  severidad: TelltaleSeverity;
  debeDetenerse: boolean;
}

export type TelltaleColor = 'rojo' | 'amarillo' | 'verde' | 'azul' | 'blanco' | 'desconocido';

export interface DiagnosedTelltale {
  nombre: string;
  descripcionSimbolo: string;
  color: TelltaleColor;
  parpadeando: boolean | null;
  categoria: string;
  urgencia: TelltaleSeverity;
  debeDetenerse: boolean;
  accion: string;
  significado: string;
  porQuePasa: string[];
  puedesRevisar: string[];
  noHagas: string[];
  cuandoIrAlMecanico: string;
  notaDelVehiculo: string | null;
  confianza: number;
}

export type DiagnosisOrigin = 'ia' | 'manual';

export interface Diagnosed {
  status: 'diagnosed';
  id: string;
  origen: DiagnosisOrigin;
  /** La mayor confianza entre los testigos; null si se eligió de la lista. */
  confianza: number | null;
  descripcion: string | null;
  createdAt: string;
  urgenciaGeneral: TelltaleSeverity;
  debeDetenerse: boolean;
  accionGeneral: string;
  mensajeGeneral: string;
  /** Si la foto se pudo leer pero conviene repetirla, el motivo. */
  mejorFoto: string | null;
  testigos: DiagnosedTelltale[];
  aviso: string;
}

export type BetterInputReason = 'no_telltales_found' | 'low_confidence';

export interface NeedsBetterInput {
  status: 'needs_better_input';
  reason: BetterInputReason;
  pista: string;
  avisoSeguridad: string;
  puedeElegirDeLaLista: true;
}

export interface NotRecognized {
  status: 'not_recognized';
  pista: string;
  avisoSeguridad: string;
  puedeElegirDeLaLista: true;
}

export type DiagnosisResult = Diagnosed | NeedsBetterInput | NotRecognized;

/** Al menos uno de image, description o telltaleId es obligatorio. Con telltaleId el backend no llama a la IA. */
export interface DiagnosisInput {
  image?: File;
  description?: string;
  telltaleId?: string;
  /** Solo se envía si el usuario lo marca: no marcarlo no significa que esté fijo. */
  blinking?: boolean;
}

export interface DiagnosisHistoryItem {
  id: string;
  /** Solo en la elección manual. */
  telltaleId: string | null;
  /** El testigo más grave; null si ya no está en el catálogo. */
  nombre: string | null;
  totalTestigos: number;
  severidad: TelltaleSeverity;
  debeDetenerse: boolean;
  origen: DiagnosisOrigin;
  confianza: number | null;
  descripcion: string | null;
  createdAt: string;
}

export interface DiagnosisHistory {
  items: DiagnosisHistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatHistory {
  messages: ChatMessage[];
  restantes: number;
}

export interface ChatExchange {
  question: ChatMessage;
  answer: ChatMessage;
  restantes: number;
}
