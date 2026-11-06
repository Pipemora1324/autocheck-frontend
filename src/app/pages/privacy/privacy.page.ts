import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicConfigService } from '../../core/http/public-config.service';

/** Resumen de la política de tratamiento de datos (Ley 1581 de 2012). Debe coincidir con la sección del README del backend. */
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  template: `
    <article class="content-page">
      <span class="eyebrow">Ley 1581 de 2012</span>
      <h1>Política de tratamiento de datos</h1>
      <p class="lead">
        Versión {{ version() }}. Proyecto académico: este texto no es asesoría legal.
      </p>
      @if (consent()) {
        <h2>Lo que autorizas al registrarte</h2>
        <p>{{ consent() }}</p>
      }

      <h2>Responsable del tratamiento</h2>
      <p>
        Juan Felipe Mora. Para consultas, reclamos y solicitudes sobre tus datos escribe a
        <a href="mailto:juan.morarevel@campusucc.edu.co">juan.morarevel&#64;campusucc.edu.co</a>.
      </p>

      <h2>Qué guardamos y para qué</h2>
      <ul>
        <li>
          <strong>Correo electrónico:</strong> identificar tu cuenta, iniciar sesión y enviarte
          enlaces de verificación y recuperación.
        </li>
        <li>
          <strong>Contraseña:</strong> solo un hash (argon2id). Nunca guardamos ni registramos la
          contraseña.
        </li>
        <li>
          <strong>Fecha en que aceptaste esta política y su versión:</strong> como prueba de tu
          autorización.
        </li>
        <li>
          <strong>Vehículos de tu garaje:</strong> placa, marca, línea, modelo (año), color,
          combustible, kilometraje y los demás datos que registres.
        </li>
        <li>
          <strong>Historial de diagnósticos:</strong> los testigos con su explicación, semáforo y
          confianza, la descripción que escribas y la fecha, para que consultes tus diagnósticos
          anteriores. La foto no se guarda. Puedes borrar cada diagnóstico.
        </li>
        <li>
          <strong>Conversación con la IA:</strong> tus mensajes y las respuestas sobre cada
          diagnóstico. Se borran al borrar el diagnóstico, el vehículo o tu cuenta.
        </li>
        <li>
          <strong>Registros técnicos:</strong> IP, ruta (con la placa oculta), código de respuesta y
          hora, para seguridad y solución de problemas. No registramos contraseñas, tokens,
          imágenes, descripciones, placas ni datos de documentos.
        </li>
      </ul>

      <h2>Encargados externos</h2>
      <ul>
        <li><strong>Vercel:</strong> aloja esta aplicación web.</li>
        <li><strong>Render:</strong> aloja el servidor (API).</li>
        <li><strong>Neon:</strong> aloja la base de datos.</li>
        <li><strong>Brevo:</strong> envía los correos de verificación y recuperación.</li>
        <li>
          <strong>Proveedor de lectura de la tarjeta</strong> (Google Gemini o Anthropic): recibe la
          foto, solo si usas esa función.
        </li>
        <li>
          <strong>Proveedor de diagnóstico</strong> (Google Gemini): recibe la foto del tablero, tu
          descripción y la marca, línea, año y combustible del vehículo, solo si pides el
          diagnóstico con IA. Si usas el chat, recibe además tus mensajes, la conversación, el
          diagnóstico y el kilometraje. No recibe la placa.
        </li>
      </ul>

      <h2>Foto de la tarjeta de propiedad</h2>
      <ul>
        <li>Se procesa en memoria y no se guarda en disco ni en la base de datos.</li>
        <li>
          Se envía a un proveedor externo de inteligencia artificial (Google Gemini o Anthropic, en
          Estados Unidos: transmisión internacional de datos) solo para leer el texto, y se descarta
          al terminar. Con el plan gratuito de Google Gemini, Google puede usar el contenido enviado
          para mejorar sus productos.
        </li>
        @if (scanNotice()) {
          <li><strong>Proveedor activo ahora:</strong> {{ scanNotice() }}</li>
        }
        <li>No subas la tarjeta de otra persona sin su autorización.</li>
        <li>
          Los datos leídos se te muestran para que los revises; solo se guarda lo que confirmes.
        </li>
        <li>El nombre y el documento del propietario no se extraen ni se guardan.</li>
      </ul>

      <h2>Foto del tablero (diagnóstico con IA)</h2>
      <ul>
        <li>
          La foto del tablero y tu descripción se envían a un proveedor externo de inteligencia
          artificial para identificar los testigos y explicarlos (Google Gemini, en Estados Unidos:
          transmisión internacional de datos).
        </li>
        <li>
          En el plan gratuito de Google Gemini, el proveedor puede usar lo enviado para mejorar sus
          productos.
        </li>
        <li>
          AutoCheck-CO procesa la foto en memoria y no la guarda: ni en disco, ni en la base de
          datos, ni en registros.
        </li>
        @if (diagnosisNotice()) {
          <li><strong>Aviso vigente:</strong> {{ diagnosisNotice() }}</li>
        }
        <li>
          Usa solo fotos del tablero de tu propio vehículo o de uno que estés autorizado a usar, y
          evita que aparezcan personas o documentos.
        </li>
        <li>
          <strong>Alternativa:</strong> elegir el testigo de la lista no envía nada a terceros.
        </li>
      </ul>

      <h2>Tus derechos</h2>
      <ul>
        <li>
          <strong>Conocer y actualizar:</strong> puedes ver y editar los datos de tu garaje y
          consultar tu historial de diagnósticos en cualquier momento.
        </li>
        <li>
          <strong>Suprimir y revocar la autorización:</strong> en
          <a routerLink="/cuenta">Mi cuenta</a> puedes eliminar tu cuenta; se borran tus datos,
          sesiones, vehículos, diagnósticos y conversaciones. Borrar un vehículo también borra su
          historial.
        </li>
        <li><strong>Otras solicitudes:</strong> al correo del responsable indicado arriba.</li>
      </ul>

      <p class="note">
        Los diagnósticos de AutoCheck-CO son orientación general. Un mecánico debe confirmar el
        diagnóstico.
      </p>
    </article>
  `,
})
export class PrivacyPage {
  private readonly publicConfig = inject(PublicConfigService);
  readonly version = computed(
    () => this.publicConfig.config()?.privacyPolicy.version ?? '2026-11-05.1',
  );
  readonly consent = computed(
    () => this.publicConfig.config()?.privacyPolicy.registrationConsent ?? '',
  );
  readonly scanNotice = computed(() => this.publicConfig.config()?.cardScan.notice ?? '');
  readonly diagnosisNotice = computed(() => this.publicConfig.config()?.diagnosis.notice ?? '');

  constructor() {
    this.publicConfig.load().subscribe();
  }
}
