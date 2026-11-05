// Contrato de /telltales y /garage/:plate/diagnoses (ver docs/API.md del backend).
// El contenido del diagnóstico siempre lo redacta el servidor desde su catálogo: aquí solo se muestra.

export type TelltaleSeverity = 'rojo' | 'amarillo' | 'informativo';

/** Del más urgente al menos urgente: el orden en que se agrupa la lista de testigos. */
export const SEVERITIES: readonly TelltaleSeverity[] = ['rojo', 'amarillo', 'informativo'];

/** Texto del semáforo. El color nunca va solo. */
export const SEVERITY_LABEL: Record<TelltaleSeverity, string> = {
  rojo: 'Detente',
  amarillo: 'Revísalo pronto',
  informativo: 'No es una falla'
};

/** Rojo sin orden de detenerse (airbag): el vehículo puede moverse, pero hay que revisarlo hoy. */
export const RED_NO_STOP_LABEL = 'Revísalo hoy';

export const DIAGNOSIS_DISCLAIMER = 'Orientación general. Un mecánico debe confirmar el diagnóstico.';

export interface TelltaleSummary {
  id: string;
  nombre: string;
  alias: string[];
  severidad: TelltaleSeverity;
  debeDetenerse: boolean;
}

export interface Urgency {
  semaforo: TelltaleSeverity;
  titulo: string;
  accion: string;
  debeDetenerse: boolean;
  esFalla: boolean;
}

export type DiagnosisOrigin = 'ia' | 'manual';

export interface Diagnosed {
  status: 'diagnosed';
  id: string;
  origen: DiagnosisOrigin;
  confianza: number | null;
  createdAt: string;
  telltale: { id: string; nombre: string; descripcionSimbolo: string };
  severidad: TelltaleSeverity;
  urgencia: Urgency;
  significado: string;
  causasProbables: string[];
  puedesRevisar: string[];
  noHagas: string[];
  cuandoIrAlMecanico: string;
  notaEspecificaDelVehiculo: string | null;
  avisoCompatibilidad: string | null;
  aviso: string;
}

export interface NeedsBetterInput {
  status: 'needs_better_input';
  pista: string;
  avisoSeguridad: string;
  puedeElegirDeLaLista: true;
}

export type DiagnosisResult = Diagnosed | NeedsBetterInput;

/** Al menos uno es obligatorio. Con telltaleId el backend no llama a la IA. */
export interface DiagnosisInput {
  image?: File;
  description?: string;
  telltaleId?: string;
}

export interface DiagnosisHistoryItem {
  id: string;
  telltaleId: string;
  /** null si el testigo ya no está en el catálogo. */
  nombre: string | null;
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
