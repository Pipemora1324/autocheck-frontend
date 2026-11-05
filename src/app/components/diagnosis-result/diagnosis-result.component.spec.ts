import { TestBed } from '@angular/core/testing';
import { diagnosed, diagnosedAirbag, diagnosedRed } from '../../../testing/diagnosis-fixtures';
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
  it('muestra todas las secciones del catálogo y el aviso fijo', async () => {
    const element = await render(diagnosed());
    expect(element.querySelector('h3')?.textContent).toBe('Check engine');
    const headings = [...element.querySelectorAll('h4')].map((item) => item.textContent);
    expect(headings).toEqual(['Qué significa', 'Causas probables', 'Qué puedes revisar tú', 'Qué NO hacer', 'Cuándo ir al mecánico']);
    expect(element.textContent).toContain('La computadora del motor registró una falla.');
    expect(element.textContent).toContain('Sensor con falla');
    expect(element.textContent).toContain('Revisa que la tapa del tanque esté bien cerrada.');
    expect(element.textContent).toContain('No borres el código');
    expect(element.textContent).toContain('Si se ignora, se puede dañar el catalizador.');
    expect(element.querySelector('.diagnosis-disclaimer')?.textContent).toBe('Orientación general. Un mecánico debe confirmar el diagnóstico.');
    expect(element.textContent).toContain('confianza 93 %');
  });

  it('el semáforo tiene color y texto', async () => {
    const cases: Array<[TelltaleSeverity, string, Diagnosed]> = [
      ['rojo', 'Detente', diagnosedRed()],
      ['amarillo', 'Revísalo pronto', diagnosed()],
      ['informativo', 'No es una falla', diagnosed({ severidad: 'informativo' })]
    ];
    for (const [severity, label, result] of cases) {
      const element = await render(result);
      const badge = element.querySelector('.severity-badge')!;
      expect(badge.classList).toContain(severity);
      expect(badge.textContent).toContain(label);
    }
  });

  it('en rojo muestra el banner destacado de detenerse', async () => {
    const element = await render(diagnosedRed());
    const banner = element.querySelector('.stop-banner')!;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Detente en un lugar seguro');
    expect(banner.textContent).toContain('llama a un taller o a una grúa');
    expect(banner.textContent).toContain('No sigas manejando.');
  });

  it('muestra el banner si el servidor ordena detenerse, aunque la severidad no sea roja', async () => {
    const red = diagnosedRed();
    const element = await render(diagnosed({ urgencia: red.urgencia }));
    expect(element.querySelector('.stop-banner')).toBeTruthy();
  });

  it('un rojo sin orden de detenerse (airbag) no dice "Detente" y muestra la acción del servidor', async () => {
    const element = await render(diagnosedAirbag());
    expect(element.querySelector('.stop-banner')).toBeNull();
    const badge = element.querySelector('.severity-badge')!;
    expect(badge.classList).toContain('rojo');
    expect(badge.textContent).toContain('Revísalo hoy');
    expect(badge.textContent).not.toContain('Detente');
    expect(element.querySelector('.diagnosis-action')?.textContent).toContain('llévalo a revisión hoy');
  });

  it('sin rojo no hay banner, y muestra la acción del servidor', async () => {
    const element = await render(diagnosed());
    expect(element.querySelector('.stop-banner')).toBeNull();
    expect(element.querySelector('.diagnosis-action')?.textContent).toBe('Atiéndelo pronto.');
  });

  it('la nota del vehículo y el aviso de compatibilidad solo aparecen si existen', async () => {
    const without = await render(diagnosed());
    expect(without.textContent).not.toContain('Sobre tu vehículo');
    expect(without.querySelector('.diagnosis-warning')).toBeNull();

    const element = await render(diagnosed({ notaEspecificaDelVehiculo: 'Queda junto al velocímetro.', avisoCompatibilidad: 'Normalmente no aparece en vehículos gasolina.' }));
    expect(element.textContent).toContain('Sobre tu vehículo');
    expect(element.textContent).toContain('Queda junto al velocímetro.');
    expect(element.querySelector('.diagnosis-warning')?.textContent).toContain('no aparece en vehículos gasolina');
  });

  it('distingue la elección manual de la IA', async () => {
    const element = await render(diagnosed({ origen: 'manual', confianza: null }));
    expect(element.textContent).toContain('Elegiste este testigo de la lista.');
    expect(element.textContent).not.toContain('confianza');
  });
});
