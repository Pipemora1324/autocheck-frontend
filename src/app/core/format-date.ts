const TIME_ZONE = 'America/Bogota';

const DATE = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Instante ISO como fecha de Colombia: 04/11/2026. */
export const formatDate = (iso: string) => DATE.format(new Date(iso));

/** Instante ISO como fecha y hora de Colombia. */
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));
