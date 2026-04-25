import type { Page, Route } from '@playwright/test'

export const MOCK_USER = {
  id: 'user-test-001',
  email: 'test@example.com',
  name: 'Test Alpinista',
}

export const MOCK_ADMIN = {
  id: 'user-admin-001',
  email: 'seguridad.acp.cl@gmail.com',
  name: 'Admin Seguridad',
}

export const MOCK_INTEGRANTE = {
  id: 'integrante-001',
  nombreCompleto: 'Test Alpinista',
  rut: '12.345.678-9',
  email: 'test@example.com',
  createdAt: new Date().toISOString(),
}

export const MOCK_SALIDA = {
  id: 'salida-001',
  nombreActividad: 'Ascenso al Plomo',
  ubicacionGeografica: 'Cajón del Maipo',
  disciplina: 'ALPINISMO',
  fechaInicio: new Date().toISOString(),
  horaRetornoEstimada: '18:00',
  status: 'EN_CURSO',
}

/** Injects a valid auth session into localStorage before page load */
export async function setAuth(page: Page, user = MOCK_USER, token = 'mock-jwt-token') {
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('pamir_auth', JSON.stringify({ user, token }))
    },
    { user, token },
  )
}

/** Mocks GET /api/integrantes/me — returns 404 (no integrante) */
export async function mockNoIntegrante(page: Page) {
  await page.route('**/api/integrantes/me', (route: Route) => {
    void route.fulfill({ status: 404, json: { error: 'Sin ficha de integrante' } })
  })
}

/** Mocks GET /api/integrantes/me — returns an existing integrante */
export async function mockHasIntegrante(page: Page) {
  await page.route('**/api/integrantes/me', (route: Route) => {
    void route.fulfill({ status: 200, json: MOCK_INTEGRANTE })
  })
}

/** Mocks GET /api/salidas */
export async function mockSalidas(page: Page, salidas: unknown[] = []) {
  await page.route('**/api/salidas', (route: Route) => {
    if (route.request().method() === 'GET') {
      void route.fulfill({ status: 200, json: salidas })
    } else {
      void route.continue()
    }
  })
}

/** Mocks POST /api/integrantes */
export async function mockCreateIntegrante(page: Page) {
  await page.route('**/api/integrantes', (route: Route) => {
    if (route.request().method() === 'POST') {
      void route.fulfill({ status: 201, json: MOCK_INTEGRANTE })
    } else {
      void route.continue()
    }
  })
}
