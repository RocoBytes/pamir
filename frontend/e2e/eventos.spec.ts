import { test, expect, type Page, type Route } from '@playwright/test'
import {
  setAuth,
  mockMe,
  mockHasIntegrante,
  mockSalidas,
  MOCK_USER,
  MOCK_ADMIN,
} from './helpers'

const MOCK_CATEGORIA = {
  id: 4,
  slug: 'trekking',
  nombre: 'Trekking',
  color: '#8B6A4F',
  orden: 4,
  activa: true,
}

// Fechas relativas: el evento siempre es futuro y las inscripciones están abiertas
const DIA = 86_400_000
const inicioIso = `${new Date(Date.now() + 10 * DIA).toISOString().slice(0, 10)}T00:00:00.000Z`
const corteIso = new Date(Date.now() + 5 * DIA).toISOString()

const MOCK_EVENTO = {
  id: 'evento-001',
  titulo: 'Trekking Cerro Provincia',
  categoriaId: 4,
  estado: 'PUBLICADO',
  fechaInicio: inicioIso,
  horaInicio: '07:30',
  fechaFin: inicioIso,
  duracionTexto: '1 día',
  ubicacion: 'Cajón del Maipo',
  reunionCoordinacion: 'Jueves, 20:00, online',
  organizadorNombre: 'María Organizadora',
  alturaMaximaMsnm: 2750,
  dificultad: 3,
  costoTexto: null,
  cupos: 12,
  fechaCorte: corteIso,
  objetivo: 'Cumbre del Cerro Provincia',
  itinerario: 'Salida 07:30 desde el club',
  incluye: null,
  noIncluye: null,
  recomendaciones: null,
  avisoDestacado: null,
  creadoPor: 'user-admin-001',
  creadoAt: new Date().toISOString(),
  actualizadoAt: new Date().toISOString(),
  publicadoAt: new Date().toISOString(),
  finalizadoAt: null,
  finalizadoPor: null,
  canceladoAt: null,
  motivoCancelacion: null,
  categoria: MOCK_CATEGORIA,
  totalPostulantes: 3,
  miInscripcion: null,
}

const MOCK_DECLARACION = {
  id: 1,
  version: '2026-08',
  titulo: 'DECLARACIÓN JURADA DEL PARTICIPANTE — Declaro bajo mi responsabilidad que:',
  items: [
    'Punto uno de la declaración.',
    'Punto dos de la declaración.',
    'Punto tres de la declaración.',
    'Punto cuatro de la declaración.',
    'Punto cinco de la declaración.',
    'Punto seis de la declaración.',
    'Punto siete de la declaración.',
  ],
}

type MiEstado = 'ninguna' | 'postulado' | 'retirado'

/** Mocks del detalle + inscripción con estado mutable entre requests */
async function mockDetalleConInscripcion(page: Page, inicial: MiEstado) {
  const estado: { mi: MiEstado; lastPayload: unknown } = { mi: inicial, lastPayload: null }

  await page.route('**/api/eventos/evento-001', (route: Route) => {
    void route.fulfill({
      status: 200,
      json: {
        ...MOCK_EVENTO,
        declaracionVigente: MOCK_DECLARACION,
        miInscripcion:
          estado.mi === 'ninguna'
            ? null
            : { estado: estado.mi === 'postulado' ? 'POSTULADO' : 'RETIRADO' },
      },
    })
  })

  await page.route('**/api/eventos/evento-001/inscripcion', (route: Route) => {
    const method = route.request().method()
    if (method === 'POST') {
      estado.lastPayload = route.request().postDataJSON()
      estado.mi = 'postulado'
      void route.fulfill({ status: 201, json: { inscripcion: { id: 'insc-001', estado: 'POSTULADO' } } })
    } else if (method === 'DELETE') {
      estado.mi = 'retirado'
      void route.fulfill({ status: 200, json: { inscripcion: { id: 'insc-001', estado: 'RETIRADO' } } })
    } else {
      void route.continue()
    }
  })

  return estado
}

async function mockEventosApi(page: Page) {
  await page.route('**/api/eventos/categorias', (route: Route) => {
    void route.fulfill({ status: 200, json: [MOCK_CATEGORIA] })
  })
  // La lista puede pedirse con o sin query string
  await page.route('**/api/eventos', (route: Route) => {
    void route.fulfill({ status: 200, json: [MOCK_EVENTO] })
  })
  await page.route('**/api/eventos?*', (route: Route) => {
    void route.fulfill({ status: 200, json: [MOCK_EVENTO] })
  })
}

test.describe('Eventos del club – socio', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, MOCK_USER)
    await mockMe(page, MOCK_USER)
    await mockHasIntegrante(page)
    await mockSalidas(page)
    await mockEventosApi(page)
  })

  test('el Dashboard muestra la tarjeta de Eventos del club', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('button', { name: 'Abrir eventos del club' })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Eventos del club')
    await expect(card).toContainText('Calendario de actividades e inscripciones')
  })

  test('abre Eventos y ve la tarjeta publicada con badge de categoría e inscripciones abiertas', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir eventos del club' }).click()

    await expect(page.getByRole('heading', { name: 'Eventos del club' })).toBeVisible()
    await expect(page.getByText('Trekking Cerro Provincia')).toBeVisible()
    // Badge de categoría dentro de la tarjeta (el chip de filtro también dice Trekking)
    const card = page.locator('button', { hasText: 'Trekking Cerro Provincia' })
    await expect(card.getByText('Trekking', { exact: true })).toBeVisible()
    await expect(card.getByText(/Inscripciones abiertas/)).toBeVisible()
    await expect(card.getByText('12 cupos · 3 postulantes')).toBeVisible()
  })

  test('un socio NO ve el botón Crear evento ni Gestionar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir eventos del club' }).click()

    await expect(page.getByRole('heading', { name: 'Eventos del club' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Crear evento/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Gestionar/ })).toHaveCount(0)
  })
})

test.describe('Eventos del club – inscripción (socio)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, MOCK_USER)
    await mockMe(page, MOCK_USER)
    await mockHasIntegrante(page)
    await mockSalidas(page)
    await mockEventosApi(page)
  })

  async function abrirDetalle(page: Page) {
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir eventos del club' }).click()
    await page.getByText('Trekking Cerro Provincia').click()
  }

  test('flujo SÍ: vehículo → cupos → declaración 7/7 → payload correcto y estado postulado', async ({ page }) => {
    const estado = await mockDetalleConInscripcion(page, 'ninguna')
    await abrirDetalle(page)

    await page.getByRole('button', { name: 'Inscribirme' }).click()
    const modal = page.getByRole('dialog', { name: /Inscripción/ })
    await expect(modal.getByText('¿Cuento con vehículo propio?')).toBeVisible()

    await modal.getByRole('button', { name: 'SÍ' }).click()
    await expect(
      modal.getByText('¿Cuántos cupos puedo entregar para otros participantes?'),
    ).toBeVisible()
    await modal.getByRole('button', { name: 'Sumar un cupo' }).click()
    await modal.getByRole('button', { name: 'Sumar un cupo' }).click()
    await modal.getByRole('button', { name: 'Continuar' }).click()

    await expect(modal.getByText(/DECLARACIÓN JURADA DEL PARTICIPANTE/)).toBeVisible()
    const checks = modal.locator('input[type="checkbox"]')
    await expect(checks).toHaveCount(7)
    const confirmar = modal.getByRole('button', { name: 'Confirmar inscripción' })
    await expect(confirmar).toBeDisabled()
    for (let i = 0; i < 7; i++) {
      await checks.nth(i).check()
    }
    await expect(confirmar).toBeEnabled()
    await confirmar.click()

    await expect(page.getByText(/Estás postulado\/a/)).toBeVisible()
    expect(estado.lastPayload).toEqual({
      tieneVehiculo: true,
      cuposVehiculo: 2,
      declaracionVersionId: 1,
      itemsAceptados: [true, true, true, true, true, true, true],
    })
  })

  test('flujo NO: salta el paso de cupos directo a la declaración', async ({ page }) => {
    await mockDetalleConInscripcion(page, 'ninguna')
    await abrirDetalle(page)

    await page.getByRole('button', { name: 'Inscribirme' }).click()
    const modal = page.getByRole('dialog', { name: /Inscripción/ })
    await modal.getByRole('button', { name: 'NO', exact: true }).click()

    await expect(modal.getByText('Paso 3 de 3')).toBeVisible()
    await expect(
      modal.getByText('¿Cuántos cupos puedo entregar para otros participantes?'),
    ).toHaveCount(0)
    await expect(modal.getByText(/DECLARACIÓN JURADA DEL PARTICIPANTE/)).toBeVisible()
  })

  test('postulado: puede retirar la postulación con confirmación inline', async ({ page }) => {
    await mockDetalleConInscripcion(page, 'postulado')
    await abrirDetalle(page)

    await expect(page.getByText(/Estás postulado\/a/)).toBeVisible()
    await page.getByRole('button', { name: 'Retirar postulación' }).click()
    await expect(page.getByText('¿Retirar tu postulación?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar retiro' }).click()

    await expect(page.getByText('Retiraste tu postulación.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Inscribirme nuevamente' })).toBeVisible()
  })
})

test.describe('Eventos del club – admin (rol ADMIN)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, MOCK_ADMIN)
    await mockMe(page, MOCK_ADMIN)
    await mockHasIntegrante(page)
    await mockSalidas(page)
    await mockEventosApi(page)
  })

  test('el admin ve Crear evento y Gestionar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir eventos del club' }).click()

    await expect(page.getByRole('heading', { name: 'Eventos del club' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Crear evento/ })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Gestionar Trekking Cerro Provincia' }),
    ).toBeVisible()
  })
})
