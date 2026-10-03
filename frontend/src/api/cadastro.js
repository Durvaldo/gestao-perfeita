import api from './axios'

function createCrudApi(resource) {
  return {
    list: (page = 1) => api.get(`/api/${resource}`, { params: { page } }).then((r) => r.data),
    create: (payload) => api.post(`/api/${resource}`, payload).then((r) => r.data),
    update: (id, payload) => api.put(`/api/${resource}/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/api/${resource}/${id}`),
  }
}

export const clientesApi = createCrudApi('clientes')
export const servicosApi = createCrudApi('servicos')
export const produtosApi = createCrudApi('produtos')
export const barbeirosApi = createCrudApi('barbeiros')

export function horariosTrabalhoApi(barbeiroId) {
  const base = `barbeiros/${barbeiroId}/horarios-trabalho`

  return {
    list: () => api.get(`/api/${base}`).then((r) => r.data),
    create: (payload) => api.post(`/api/${base}`, payload).then((r) => r.data),
    update: (id, payload) => api.put(`/api/horarios-trabalho/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/api/horarios-trabalho/${id}`),
  }
}
