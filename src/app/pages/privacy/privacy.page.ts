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
      <p class="lead">Versión {{ version() }}. Proyecto académico: este texto no es asesoría legal.</p>
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
        <li><strong>Correo electrónico:</strong> identificar tu cuenta, iniciar sesión y enviarte enlaces de verificación y recuperación.</li>
        <li><strong>Contraseña:</strong> solo un hash (argon2id). Nunca guardamos ni registramos la contraseña.</li>
        <li><strong>Fecha en que aceptaste esta política y su versión:</strong> como prueba de tu autorización.</li>
        <li><strong>Vehículos de tu garaje:</strong> placa, marca, modelo, vigencias de SOAT y RTM y los demás datos que registres, para calcular alertas.</li>
        <li><strong>Registros técnicos:</strong> IP, ruta, código de respuesta y hora, para seguridad y diagnóstico. No registramos contraseñas, tokens ni datos de documentos.</li>
      </ul>

      <h2>Encargados externos</h2>
      <ul>
        <li><strong>Vercel:</strong> aloja esta aplicación web.</li>
        <li><strong>Render:</strong> aloja el servidor (API).</li>
        <li><strong>Neon:</strong> aloja la base de datos.</li>
        <li><strong>Brevo:</strong> envía los correos de verificación y recuperación.</li>
        <li><strong>Proveedor de lectura de la tarjeta</strong> (Google Gemini o Anthropic): recibe la foto, solo si usas esa función.</li>
      </ul>

      <h2>Foto de la tarjeta de propiedad</h2>
      <ul>
        <li>Se procesa en memoria y no se guarda en disco ni en la base de datos.</li>
        <li>
          Se envía a un proveedor externo de inteligencia artificial (Google Gemini o Anthropic, en Estados Unidos: transmisión internacional de datos)
          solo para leer el texto, y se descarta al terminar. Con el plan gratuito de Google Gemini, Google puede usar el contenido enviado para mejorar sus productos.
        </li>
        @if (scanNotice()) {
          <li><strong>Proveedor activo ahora:</strong> {{ scanNotice() }}</li>
        }
        <li>No subas la tarjeta de otra persona sin su autorización.</li>
        <li>Los datos leídos se te muestran para que los revises; solo se guarda lo que confirmes.</li>
        <li><strong>El número de documento del propietario nunca se guarda</strong>, ni en el servidor ni en tu navegador.</li>
      </ul>

      <h2>Consulta a un proveedor RUNT</h2>
      <p>
        Es opcional y por ahora no está disponible. Si se activa, la placa y el documento del propietario se envían al proveedor contratado solo
        cuando lo pidas y con tu autorización expresa en cada consulta. AutoCheck-CO no consulta el sitio oficial del RUNT.
      </p>

      <h2>Tus derechos</h2>
      <ul>
        <li><strong>Conocer y actualizar:</strong> puedes ver y editar los datos de tu garaje en cualquier momento.</li>
        <li><strong>Suprimir y revocar la autorización:</strong> en <a routerLink="/cuenta">Mi cuenta</a> puedes eliminar tu cuenta; se borran tus datos, sesiones y vehículos.</li>
        <li><strong>Otras solicitudes:</strong> al correo del responsable indicado arriba.</li>
      </ul>

      <p class="note">Los conceptos y vigencias que muestra AutoCheck-CO se calculan con los datos que registras y no son una consulta oficial.</p>
    </article>
  `
})
export class PrivacyPage {
  private readonly publicConfig = inject(PublicConfigService);
  readonly version = computed(() => this.publicConfig.config()?.privacyPolicy.version ?? '2026-11-02.2');
  readonly consent = computed(() => this.publicConfig.config()?.privacyPolicy.registrationConsent ?? '');
  readonly scanNotice = computed(() => this.publicConfig.config()?.cardScan.notice ?? '');

  constructor() {
    this.publicConfig.load().subscribe();
  }
}
