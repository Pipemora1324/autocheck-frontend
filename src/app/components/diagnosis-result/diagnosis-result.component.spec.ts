import { TestBed } from '@angular/core/testing';
import { diagnosed, diagnosedAirbag, diagnosedRed, redTelltale, telltale } from '../../../testing/diagnosis-fixtures';
import type { Diagnosed, TelltaleSeverity } from '../../models/diagnosis';
import { DiagnosisResultComponent } from './diagnosis-result.component';

const render = async (result: Diagnosed) => {
  const fixture = TestBed.createComponent(DiagnosisResultComponent);
  fixture.componentRef.setInput('result', result);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
};

describe('DiagnosisResultComponent', () => {
  it('muestra todas las secciones del testigo y el aviso fijo', async () => {
    const element = await render(diagnosed());
    expect(element.querySelector('h3')?.textContent).toBe('Check engine');
    const headings = [...element.querySelectorAll('h4')].map((item) => item.textContent);
    expect(headings).toEqual(['Qué significa', 'Por qué pasa', 'Qué puedes revisar tú', 'Qué NO hacer', 'Cuándo ir al mecánico']);
    expect(element.textContent).toContain('La computadora del motor registró una falla.');
    expect(element.textContent).toContain('Sensor con falla');
    expect(element.textContent).toContain('Revisa que la tapa del tanque esté bien cerrada.');
    expect(element.textContent).toContain('No borres el código');
    expect(element.textContent).toContain('Si se ignora, se puede dañar el catalizador.');
    expect(element.querySelector('.diagnosis-disclaimer')?.textContent).toBe('Orientación general. Un mecánico debe confirmar el diagnóstico.');
  });

  it('varios testigos: una tarjeta por testigo con su semáforo, y la urgencia general arriba', async () => {
    const element = await render(diagnosedRed({ testigos: [redTelltale(), telltale(), telltale({ nombre: 'Cinturón', urgencia: 'informativo', accion: 'Es un aviso.' })] }));
    const cards = element.querySelectorAll('.diagnosis-card');
    expect(cards).toHaveLength(3);
    expect(cards[0]!.querySelector('h3')?.textContent).toBe('Presión de aceite');
    expect(cards[0]!.querySelector('.severity-badge')?.textContent).toContain('Detente');
    expect(cards[1]!.querySelector('.severity-badge')?.textContent).toContain('Revísalo pronto');
    expect(cards[2]!.querySelector('.severity-badge')?.textContent).toContain('No es una falla');
    expect(element.querySelector('.diagnosis-summary')?.textContent).toContain('Urgencia general');
    expect(element.querySelector('.diagnosis-summary .severity-badge')?.classList).toContain('rojo');
    expect(element.querySelector('.diagnosis-summary')?.textContent).toContain('identificó 3 testigos');
    expect(element.querySelectorAll('.stop-banner')).toHaveLength(1);
    expect(element.querySelectorAll('.diagnosis-disclaimer')).toHaveLength(1);
  });

  it('el semáforo tiene color y texto', async () => {
    const cases: Array<[TelltaleSeverity, string, Diagnosed]> = [
      ['rojo', 'Detente', diagnosedRed()],
      ['amarillo', 'Revísalo pronto', diagnosed()],
      ['informativo', 'No es una falla', diagnosed({ urgenciaGeneral: 'informativo' })]
    ];
    for (const [severity, label, result] of cases) {
      const badge = (await render(result)).querySelector('.severity-badge')!;
      expect(badge.classList).toContain(severity);
      expect(badge.textContent).toContain(label);
    }
  });

  it('muestra el banner de detenerse con la acción del servidor', async () => {
    const banner = (await render(diagnosedRed())).querySelector('.stop-banner')!;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Detente en un lugar seguro');
    expect(banner.textContent).toContain('llama a un taller o a una grúa');
    expect(banner.textContent).toContain('No sigas manejando.');
  });

  it('un rojo sin orden de detenerse (airbag) no dice "Detente" y muestra la acción del servidor', async () => {
    const element = await render(diagnosedAirbag());
    expect(element.querySelector('.stop-banner')).toBeNull();
    const badge = element.querySelector('.severity-badge')!;
    expect(badge.classList).toContain('rojo');
    expect(badge.textContent).toContain('Revísalo hoy');
    expect(badge.textContent).not.toContain('Detente');
    expect(element.querySelector('.diagnosis-summary .diagnosis-action')?.textContent).toContain('llévalo a revisión hoy');
  });

  it('sin rojo no hay banner', async () => {
    const element = await render(diagnosed());
    expect(element.querySelector('.stop-banner')).toBeNull();
    expect(element.querySelector('.diagnosis-action')?.textContent).toBe('Atiéndelo pronto.');
  });

  it('el mensaje general, la nota del vehículo y el motivo de mejor foto solo aparecen si existen', async () => {
    const without = await render(diagnosed());
    expect(without.textContent).not.toContain('Sobre tu vehículo');
    expect(without.querySelector('.diagnosis-warning')).toBeNull();

    const element = await render(diagnosed({ mensajeGeneral: 'Hay un testigo encendido.', mejorFoto: 'Se ve borrosa.', testigos: [telltale({ notaDelVehiculo: 'Queda junto al velocímetro.' })] }));
    expect(element.textContent).toContain('Hay un testigo encendido.');
    expect(element.textContent).toContain('Sobre tu vehículo');
    expect(element.textContent).toContain('Queda junto al velocímetro.');
    expect(element.querySelector('.diagnosis-warning')?.textContent).toContain('Se ve borrosa.');
  });

  it('una sección vacía no deja su título suelto', async () => {
    const element = await render(diagnosed({ testigos: [telltale({ significado: '', puedesRevisar: [], cuandoIrAlMecanico: '' })] }));
    const headings = [...element.querySelectorAll('h4')].map((item) => item.textContent);
    expect(headings).toEqual(['Por qué pasa', 'Qué NO hacer']);
  });

  it('avisa si la IA no está segura de un símbolo y si el testigo parpadea', async () => {
    const element = await render(diagnosed({ testigos: [telltale({ confianza: 0.4, parpadeando: true })] }));
    expect(element.textContent).toContain('No estamos seguros de este símbolo');
    expect(element.textContent).toContain('está parpadeando');
    expect((await render(diagnosed())).textContent).not.toContain('No estamos seguros');
  });

  it('distingue la elección manual de la IA', async () => {
    const element = await render(diagnosed({ origen: 'manual', confianza: null, testigos: [telltale({ confianza: 0 })] }));
    expect(element.textContent).toContain('Elegiste este testigo de la lista.');
    expect(element.textContent).not.toContain('No estamos seguros');
  });
});
