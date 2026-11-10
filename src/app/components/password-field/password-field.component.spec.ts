import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordFieldComponent } from './password-field.component';

@Component({
  imports: [ReactiveFormsModule, PasswordFieldComponent],
  template: `
    @if (shown()) {
      <form [formGroup]="form" (ngSubmit)="submitted = submitted + 1" novalidate>
        <app-password-field>
          <input
            id="clave"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </app-password-field>
        <button type="submit">Enviar</button>
      </form>
    }
  `,
})
class HostComponent {
  readonly shown = signal(true);
  submitted = 0;
  readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required]],
  });
}

describe('PasswordFieldComponent', () => {
  const render = async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    const input = () => element.querySelector<HTMLInputElement>('#clave')!;
    const toggle = () => element.querySelector<HTMLButtonElement>('.password-toggle')!;
    const click = async () => {
      toggle().click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const type = (value: string) => {
      input().value = value;
      input().dispatchEvent(new Event('input'));
    };
    return { fixture, element, input, toggle, click, type };
  };

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('empieza oculto, con un botón accesible que no envía el formulario', async () => {
    const { input, toggle } = await render();
    expect(input().type).toBe('password');
    expect(toggle().getAttribute('type')).toBe('button');
    expect(toggle().getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe('clave');
    expect(toggle().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('alterna entre mostrar y ocultar sin borrar lo escrito', async () => {
    const { fixture, input, toggle, click, type } = await render();
    type('clave-de-prueba');

    await click();
    expect(input().type).toBe('text');
    expect(input().value).toBe('clave-de-prueba');
    expect(toggle().getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().querySelector('.password-toggle-slash')).toBeTruthy();

    await click();
    expect(input().type).toBe('password');
    expect(toggle().getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().querySelector('.password-toggle-slash')).toBeNull();
    expect(fixture.componentInstance.form.getRawValue().password).toBe('clave-de-prueba');
  });

  it('no cambia el autocomplete, el id ni las validaciones del input', async () => {
    const { fixture, input, click } = await render();
    await click();
    expect(input().getAttribute('autocomplete')).toBe('current-password');
    expect(input().id).toBe('clave');
    expect(fixture.componentInstance.form.controls.password.hasError('required')).toBe(true);
  });

  it('conserva el foco y la posición del cursor en el input', async () => {
    const { input, toggle, click, type } = await render();
    type('abcdef');
    input().focus();
    input().setSelectionRange(2, 4);

    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    toggle().dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).toBe(true);
    await click();

    expect(document.activeElement).toBe(input());
    expect(input().selectionStart).toBe(2);
    expect(input().selectionEnd).toBe(4);
  });

  it('el botón no envía el formulario', async () => {
    const { fixture, click } = await render();
    await click();
    await click();
    expect(fixture.componentInstance.submitted).toBe(0);
  });

  it('vuelve a ocultarse al enviar el formulario', async () => {
    const { fixture, element, input, toggle, click } = await render();
    await click();
    expect(input().type).toBe('text');

    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.submitted).toBe(1);
    expect(input().type).toBe('password');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('vuelve a ocultarse al salir de la pantalla o cuando la pestaña queda oculta', async () => {
    const { fixture, input, click } = await render();
    await click();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(input().type).toBe('password');
    visibility.mockRestore();

    await click();
    const kept = input();
    expect(kept.type).toBe('text');
    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(kept.type).toBe('password');
  });
});
