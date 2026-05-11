import { api } from './authApi'

export const getOutagePredictions = async () => {
  const response = await api.get('/ai/predictions')
  return response.data
}

export const getSentimentStats = async () => {
  const response = await api.get('/ai/sentiment-stats')
  return response.data
}

export const getPersonalizedMessage = async () => {
  const response = await api.get('/ai/message')
  return response.data
}
