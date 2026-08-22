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
