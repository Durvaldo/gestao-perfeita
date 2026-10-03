import api from './axios'

export const agendamentosApi = {
  // Com { de, ate } a API retorna a lista completa do período (sem paginação);
  // sem params, mantém o retorno paginado ({ data: [...] }).
  list: (params = {}) => api.get('/api/agendamentos', { params }).then((r) => r.data),
  create: (payload) => api.post('/api/agendamentos', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/agendamentos/${id}`, payload).then((r) => r.data),
}

export const comandasApi = {
  list: (page = 1) => api.get('/api/comandas', { params: { page } }).then((r) => r.data),
  get: (id) => api.get(`/api/comandas/${id}`).then((r) => r.data),
  create: (payload) => api.post('/api/comandas', payload).then((r) => r.data),
  addItem: (comandaId, payload) => api.post(`/api/comandas/${comandaId}/itens`, payload).then((r) => r.data),
  removeItem: (comandaId, itemId) => api.delete(`/api/comandas/${comandaId}/itens/${itemId}`),
  fechar: (comandaId, formaPagamento) =>
    api.post(`/api/comandas/${comandaId}/fechar`, { forma_pagamento: formaPagamento }).then((r) => r.data),
}

export const financeiroApi = {
  list: (page = 1) => api.get('/api/financeiro-lancamentos', { params: { page } }).then((r) => r.data),
  create: (payload) => api.post('/api/financeiro-lancamentos', payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/financeiro-lancamentos/${id}`),
  relatorio: (inicio, fim) =>
    api.get('/api/financeiro/relatorio', { params: { inicio, fim } }).then((r) => r.data),
}

export const dashboardApi = {
  get: () => api.get('/api/dashboard').then((r) => r.data),
}
